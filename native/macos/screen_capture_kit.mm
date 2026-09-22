#import <ScreenCaptureKit/ScreenCaptureKit.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreMedia/CoreMedia.h>
#include <napi.h>
#include <string>
#include <atomic>

// ── Audio delegate ────────────────────────────────────────────────────────────
@interface AudioStreamDelegate : NSObject <SCStreamDelegate, SCStreamOutput>
@property (nonatomic, copy) void(^audioCallback)(NSData* audioData);
@property (nonatomic, copy) void(^stopCallback)(NSString* errorMsg);
@end

@implementation AudioStreamDelegate
- (void)stream:(SCStream*)stream
    didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer
    ofType:(SCStreamOutputType)type {
    if (type != SCStreamOutputTypeAudio) return;
    CMBlockBufferRef buf = CMSampleBufferGetDataBuffer(sampleBuffer);
    if (!buf) return;
    size_t len = CMBlockBufferGetDataLength(buf);
    if (len == 0) return;
    char* ptr = NULL;
    if (CMBlockBufferGetDataPointer(buf, 0, NULL, NULL, &ptr) != kCMBlockBufferNoErr) return;
    NSData* data = [NSData dataWithBytes:ptr length:len];
    if (self.audioCallback) self.audioCallback(data);
}
- (void)stream:(SCStream*)stream didStopWithError:(NSError*)error {
    // Propagate mid-recording stream failures to JS so the UI can react.
    if (error && self.stopCallback) {
        NSLog(@"[SCK] Stream stopped with error: %@", error);
        self.stopCallback(error.localizedDescription);
    }
}
@end

// ── Capture manager ───────────────────────────────────────────────────────────
class ScreenCaptureManager {
private:
    SCStream* stream = nil;
    AudioStreamDelegate* delegate = nil;
    Napi::ThreadSafeFunction audioTSFN;
    dispatch_queue_t audioQueue;
    std::atomic<bool> tsfinReleased{true}; // true = not yet allocated / already released

    // Safe single-release guard
    void releaseTSFN() {
        bool expected = false;
        if (tsfinReleased.compare_exchange_strong(expected, true)) {
            audioTSFN.Release();
        }
    }

    void failWith(const std::string& msg) {
        NSLog(@"[SCK] Error: %s", msg.c_str());
        if (!tsfinReleased.load()) {
            audioTSFN.NonBlockingCall([msg](Napi::Env env, Napi::Function cb) {
                cb.Call({Napi::String::New(env, msg)});
            });
            releaseTSFN();
        }
    }

public:
    ScreenCaptureManager() {
        audioQueue = dispatch_queue_create("com.whisnotes.audio", DISPATCH_QUEUE_SERIAL);
    }

    ~ScreenCaptureManager() { Stop(); }

    void StartAsync(Napi::Env env, Napi::Function callback) {
        if (@available(macOS 13.0, *)) {
            audioTSFN = Napi::ThreadSafeFunction::New(
                env, callback, "AudioCallback", 0, 1, [](Napi::Env) {}
            );
            tsfinReleased.store(false); // now allocated

            ScreenCaptureManager* self = this;

            dispatch_async(audioQueue, ^{
                [SCShareableContent getShareableContentWithCompletionHandler:^(
                    SCShareableContent* content, NSError* contentErr) {

                    if (contentErr) {
                        self->failWith(contentErr.localizedDescription.UTF8String);
                        return;
                    }
                    if (!content) {
                        self->failWith("No shareable content — grant Screen Recording permission in System Settings → Privacy & Security → Screen Recording");
                        return;
                    }
                    if (content.displays.count == 0) {
                        self->failWith("No displays found");
                        return;
                    }

                    SCDisplay* display = content.displays.firstObject;

                    SCStreamConfiguration* cfg = [[SCStreamConfiguration alloc] init];
                    cfg.capturesAudio = YES;
                    cfg.excludesCurrentProcessAudio = YES;
                    cfg.channelCount = 1;
                    cfg.sampleRate = 16000;

                    SCContentFilter* filter = [[SCContentFilter alloc]
                        initWithDisplay:display
                        excludingApplications:@[]
                        exceptingWindows:@[]];

                    self->stream = [[SCStream alloc] initWithFilter:filter
                                                      configuration:cfg
                                                           delegate:nil];
                    self->delegate = [[AudioStreamDelegate alloc] init];

                    // BUG-2 FIX: Acquire() so the TSFN stays alive until the block is done.
                    // Each audio frame calls NonBlockingCall on the acquired copy.
                    // The copy is never explicitly released — the main TSFN Release() in
                    // Stop()/failWith() decrements the ref-count; when it reaches zero the
                    // finalize callback cleans up. This is the correct N-API lifecycle.
                    self->audioTSFN.Acquire();
                    Napi::ThreadSafeFunction audioCopy = self->audioTSFN;

                    self->delegate.audioCallback = ^(NSData* audioData) {
                        if (self->tsfinReleased.load()) return; // already stopped
                        NSData* copy = [audioData copy];
                        audioCopy.NonBlockingCall([copy](Napi::Env env, Napi::Function cb) {
                            Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::Copy(
                                env, (uint8_t*)copy.bytes, copy.length
                            );
                            cb.Call({buf});
                        });
                    };

                    // BUG-3 FIX: Propagate mid-recording stream stops to JS.
                    self->delegate.stopCallback = ^(NSString* errMsg) {
                        self->failWith(errMsg.UTF8String);
                    };
                    // Set delegate on the stream for SCStreamDelegate callbacks
                    [self->stream setValue:self->delegate forKey:@"delegate"];

                    NSError* outErr = nil;
                    [self->stream addStreamOutput:self->delegate
                                             type:SCStreamOutputTypeAudio
                               sampleHandlerQueue:self->audioQueue
                                            error:&outErr];
                    if (outErr) {
                        self->failWith(outErr.localizedDescription.UTF8String);
                        return;
                    }

                    [self->stream startCaptureWithCompletionHandler:^(NSError* startErr) {
                        if (startErr) {
                            self->failWith(startErr.localizedDescription.UTF8String);
                        } else {
                            NSLog(@"[SCK] System audio capture started");
                            if (!self->tsfinReleased.load()) {
                                self->audioTSFN.NonBlockingCall([](Napi::Env env, Napi::Function cb) {
                                    cb.Call({env.Null()}); // null = success
                                });
                            }
                        }
                    }];
                }];
            });
        } else {
            callback.Call({Napi::String::New(env, "ScreenCaptureKit requires macOS 13+")});
        }
    }

    void Stop() {
        if (stream) {
            [stream stopCaptureWithCompletionHandler:^(NSError*) {}];
            stream = nil;
        }
        if (delegate) {
            delegate.audioCallback = nil; // prevent callbacks after stop
            delegate.stopCallback = nil;
            delegate = nil;
        }
        releaseTSFN(); // BUG-1 FIX: safe single-release
    }
};

// ── Singleton ─────────────────────────────────────────────────────────────────
static ScreenCaptureManager* manager = nullptr;

Napi::Value StartCapture(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "Callback required").ThrowAsJavaScriptException();
        return env.Null();
    }
    if (!manager) manager = new ScreenCaptureManager();
    manager->StartAsync(env, info[0].As<Napi::Function>());
    return env.Undefined();
}

Napi::Value StopCapture(const Napi::CallbackInfo& info) {
    if (manager) { manager->Stop(); delete manager; manager = nullptr; }
    return info.Env().Null();
}

Napi::Value CheckAvailability(const Napi::CallbackInfo& info) {
    if (@available(macOS 13.0, *)) return Napi::Boolean::New(info.Env(), true);
    return Napi::Boolean::New(info.Env(), false);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("startCapture", Napi::Function::New(env, StartCapture));
    exports.Set("stopCapture",  Napi::Function::New(env, StopCapture));
    exports.Set("checkAvailability", Napi::Function::New(env, CheckAvailability));
    return exports;
}

NODE_API_MODULE(screencapturekit, Init)
