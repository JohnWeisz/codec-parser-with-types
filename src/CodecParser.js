import { concatBuffers } from "./utilities";
import MPEGParser from "./codecs/mpeg/MPEGParser";
import AACParser from "./codecs/aac/AACParser";
import OggParser from "./codecs/ogg/OggParser";

const noOp = () => {};

export default class CodecParser {
  constructor(mimeType, { onMimeType, onCodecUpdate }) {
    this._inputMimeType = mimeType;
    this._onMimeType = onMimeType || noOp;
    this._onCodecUpdate = onCodecUpdate || noOp;

    if (this._inputMimeType.match(/aac/)) {
      this._codecParser = new AACParser(this._onCodecUpdate);
    } else if (this._inputMimeType.match(/mpeg/)) {
      this._codecParser = new MPEGParser(this._onCodecUpdate);
    } else if (this._inputMimeType.match(/ogg/)) {
      this._codecParser = new OggParser(this._onCodecUpdate);
    } else {
      throw new Error(`Unsupported Codec ${mimeType}`);
    }

    this._frames = [];
    this._codecData = new Uint8Array(0);

    this._generator = this._generator();
    this._generator.next();
  }

  /**
   * @public
   * @returns The mimetype being returned from MSEAudioWrapper
   * mp3, mp4a.40.2, flac, vorbis, opus
   */
  get codec() {
    return this._codecParser.codec;
  }

  /**
   * @public
   * @returns The mimetype of the incoming audio data
   */
  get inputMimeType() {
    return this._inputMimeType;
  }

  /**
   * @public
   * @description Returns an iterator for the passed in codec data.
   * @param {Uint8Array} chunk Next chunk of codec data to read
   * @returns {IterableIterator} Iterator that operates over the codec data.
   * @yields {Uint8Array} Codec Frames
   */
  *iterator(chunk) {
    for (
      let i = this._generator.next(chunk);
      i.value;
      i = this._generator.next()
    ) {
      yield i.value;
    }
  }

  *_generator() {
    let frames = [];
    // start parsing out frames
    while (true) {
      yield* this._sendReceiveData(frames);
      frames = this._parseFrames();
    }
  }

  /**
   * @private
   */
  *_sendReceiveData(frames) {
    for (const frame of frames) {
      yield frame;
    }

    let codecData;

    do {
      codecData = yield;
    } while (!codecData);

    this._codecData = concatBuffers(this._codecData, codecData);
  }

  /**
   * @private
   */
  _parseFrames() {
    const { frames, remainingData } = this._codecParser.parseFrames(
      this._codecData
    );

    this._codecData = this._codecData.subarray(remainingData);

    return frames;
  }
}