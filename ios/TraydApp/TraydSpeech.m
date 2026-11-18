#import <AVFoundation/AVFoundation.h>
#import <React/RCTEventEmitter.h>
#import <Speech/Speech.h>

static NSString *const TraydSpeechEvent = @"TraydSpeechEvent";

@interface TraydSpeech : RCTEventEmitter
@end

@implementation TraydSpeech {
  SFSpeechRecognizer *_recognizer;
  SFSpeechAudioBufferRecognitionRequest *_request;
  SFSpeechRecognitionTask *_task;
  AVAudioEngine *_engine;
  BOOL _hasListeners;
  BOOL _running;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ TraydSpeechEvent ];
}

- (void)startObserving
{
  _hasListeners = YES;
}

- (void)stopObserving
{
  _hasListeners = NO;
}

- (void)emit:(NSDictionary *)body
{
  if (_hasListeners) {
    [self sendEventWithName:TraydSpeechEvent body:body];
  }
}

- (void)emitError:(NSString *)code
{
  [self emit:@{ @"type" : @"error", @"error" : code }];
  [self finish];
}

RCT_EXPORT_METHOD(isAvailable : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  SFSpeechRecognizer *recognizer = [[SFSpeechRecognizer alloc] initWithLocale:[NSLocale localeWithLocaleIdentifier:@"en-IE"]];
  resolve(@(recognizer != nil && recognizer.isAvailable));
}

RCT_EXPORT_METHOD(requestPermission : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  [SFSpeechRecognizer requestAuthorization:^(SFSpeechRecognizerAuthorizationStatus status) {
    if (status != SFSpeechRecognizerAuthorizationStatusAuthorized) {
      resolve(@NO);
      return;
    }
    [[AVAudioSession sharedInstance] requestRecordPermission:^(BOOL granted) {
      resolve(@(granted));
    }];
  }];
}

RCT_EXPORT_METHOD(start : (NSString *)lang)
{
  [self teardown];
  NSString *language = lang.length ? lang : @"en-IE";
  _recognizer = [[SFSpeechRecognizer alloc] initWithLocale:[NSLocale localeWithLocaleIdentifier:language]];
  if (!_recognizer) {
    [self emitError:@"language-not-supported"];
    return;
  }
  if (!_recognizer.isAvailable) {
    [self emitError:@"service-not-allowed"];
    return;
  }

  NSError *error = nil;
  AVAudioSession *session = [AVAudioSession sharedInstance];
  [session setCategory:AVAudioSessionCategoryPlayAndRecord
                  mode:AVAudioSessionModeMeasurement
               options:AVAudioSessionCategoryOptionDuckOthers | AVAudioSessionCategoryOptionDefaultToSpeaker
                 error:&error];
  [session setActive:YES withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation error:&error];
  if (error) {
    [self emitError:@"audio-capture"];
    return;
  }

  _request = [SFSpeechAudioBufferRecognitionRequest new];
  _request.shouldReportPartialResults = YES;
  _request.taskHint = SFSpeechRecognitionTaskHintDictation;
  if (@available(iOS 16.0, *)) {
    _request.addsPunctuation = YES;
  }

  _engine = [AVAudioEngine new];
  AVAudioInputNode *input = _engine.inputNode;
  AVAudioFormat *format = [input outputFormatForBus:0];
  SFSpeechAudioBufferRecognitionRequest *request = _request;
  [input installTapOnBus:0
              bufferSize:1024
                  format:format
                   block:^(AVAudioPCMBuffer *buffer, AVAudioTime *when) {
                     [request appendAudioPCMBuffer:buffer];
                   }];
  [_engine prepare];
  if (![_engine startAndReturnError:&error]) {
    [self emitError:@"audio-capture"];
    return;
  }

  _running = YES;
  [self emit:@{ @"type" : @"start" }];

  __weak TraydSpeech *weakSelf = self;
  _task = [_recognizer recognitionTaskWithRequest:_request
                                    resultHandler:^(SFSpeechRecognitionResult *result, NSError *taskError) {
                                      dispatch_async(dispatch_get_main_queue(), ^{
                                        [weakSelf handleResult:result error:taskError];
                                      });
                                    }];
}

- (void)handleResult:(SFSpeechRecognitionResult *)result error:(NSError *)error
{
  if (!_running) {
    return;
  }
  if (result) {
    [self emit:@{
      @"type" : @"result",
      @"transcript" : result.bestTranscription.formattedString ?: @"",
      @"isFinal" : @NO,
      @"cumulative" : @YES
    }];
    if (result.isFinal) {
      [self finish];
      return;
    }
  }
  if (error) {
    [self finish];
  }
}

RCT_EXPORT_METHOD(stop)
{
  if (!_running) {
    return;
  }
  [_engine stop];
  [_engine.inputNode removeTapOnBus:0];
  [_request endAudio];
}

RCT_EXPORT_METHOD(abort)
{
  [self finish];
}

- (void)finish
{
  BOOL wasRunning = _running;
  [self teardown];
  if (wasRunning) {
    [self emit:@{ @"type" : @"end" }];
  }
}

- (void)teardown
{
  _running = NO;
  if (_engine.isRunning) {
    [_engine stop];
    [_engine.inputNode removeTapOnBus:0];
  }
  [_task cancel];
  _task = nil;
  _request = nil;
  _engine = nil;
  [[AVAudioSession sharedInstance] setActive:NO
                                 withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation
                                       error:nil];
}

- (void)invalidate
{
  [self teardown];
  [super invalidate];
}

@end
