package com.trayd.app.speech

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

class TraydSpeechModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), RecognitionListener {

  private val main = Handler(Looper.getMainLooper())
  private var recognizer: SpeechRecognizer? = null
  private var active = false
  private var language = DEFAULT_LANGUAGE

  override fun getName() = NAME

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(SpeechRecognizer.isRecognitionAvailable(context))
  }

  @ReactMethod
  fun start(lang: String?) {
    main.post {
      language = lang?.takeIf { it.isNotBlank() } ?: DEFAULT_LANGUAGE
      active = true
      emit(Arguments.createMap().apply { putString("type", "start") })
      listen()
    }
  }

  @ReactMethod
  fun stop() {
    main.post {
      active = false
      recognizer?.stopListening() ?: finish()
    }
  }

  @ReactMethod
  fun abort() {
    main.post {
      active = false
      recognizer?.cancel()
      finish()
    }
  }

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit

  override fun invalidate() {
    main.post {
      active = false
      release()
    }
    super.invalidate()
  }

  private fun listen() {
    release()
    val created = SpeechRecognizer.createSpeechRecognizer(context)
    created.setRecognitionListener(this)
    recognizer = created
    created.startListening(buildIntent())
  }

  private fun buildIntent() = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
    putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
    putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language)
    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, SILENCE_MS)
    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, SILENCE_MS)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      putExtra(RecognizerIntent.EXTRA_ENABLE_FORMATTING, RecognizerIntent.FORMATTING_OPTIMIZE_QUALITY)
    }
  }

  private fun release() {
    recognizer?.setRecognitionListener(null)
    recognizer?.destroy()
    recognizer = null
  }

  private fun finish() {
    active = false
    release()
    emit(Arguments.createMap().apply { putString("type", "end") })
  }

  private fun emitTranscript(results: Bundle?, isFinal: Boolean) {
    val transcript = results
      ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
      ?.firstOrNull()
      .orEmpty()
    if (transcript.isEmpty() && !isFinal) return
    emit(Arguments.createMap().apply {
      putString("type", "result")
      putString("transcript", transcript)
      putBoolean("isFinal", isFinal)
    })
  }

  private fun emit(payload: WritableMap) {
    if (context.hasActiveReactInstance()) context.emitDeviceEvent(EVENT, payload)
  }

  override fun onPartialResults(partialResults: Bundle?) = emitTranscript(partialResults, false)

  override fun onResults(results: Bundle?) {
    emitTranscript(results, true)
    if (active) listen() else finish()
  }

  override fun onError(error: Int) {
    val quiet = error == SpeechRecognizer.ERROR_NO_MATCH ||
      error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ||
      error == SpeechRecognizer.ERROR_CLIENT
    if (active && quiet) {
      listen()
      return
    }
    if (!quiet) {
      emit(Arguments.createMap().apply {
        putString("type", "error")
        putString("error", codeFor(error))
      })
    }
    finish()
  }

  private fun codeFor(error: Int) = when (error) {
    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "not-allowed"
    SpeechRecognizer.ERROR_NETWORK,
    SpeechRecognizer.ERROR_NETWORK_TIMEOUT,
    SpeechRecognizer.ERROR_SERVER -> "network"
    SpeechRecognizer.ERROR_AUDIO -> "audio-capture"
    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "busy"
    LANGUAGE_NOT_SUPPORTED, LANGUAGE_UNAVAILABLE -> "language-not-supported"
    else -> "unknown"
  }

  override fun onReadyForSpeech(params: Bundle?) = Unit
  override fun onBeginningOfSpeech() = Unit
  override fun onRmsChanged(rmsdB: Float) = Unit
  override fun onBufferReceived(buffer: ByteArray?) = Unit
  override fun onEndOfSpeech() = Unit
  override fun onEvent(eventType: Int, params: Bundle?) = Unit

  companion object {
    const val NAME = "TraydSpeech"
    private const val EVENT = "TraydSpeechEvent"
    private const val DEFAULT_LANGUAGE = "en-IE"
    private const val SILENCE_MS = 4000
    private const val LANGUAGE_NOT_SUPPORTED = 12
    private const val LANGUAGE_UNAVAILABLE = 13
  }
}
