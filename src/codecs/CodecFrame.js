/* Copyright 2020-2021 Ethan Halsall
    
    This file is part of codec-parser.
    
    codec-parser is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    codec-parser is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>
*/

import { frameStore, headerStore } from "../globals.js";
import Frame from "../containers/Frame.js";

export default class CodecFrame extends Frame {
  static *getFrame(Header, Frame, codecParser, headerCache, readOffset) {
    const header = yield* Header.getHeader(
      codecParser,
      headerCache,
      readOffset
    );

    if (header) {
      const frameLength = headerStore.get(header).frameLength;
      const samples = headerStore.get(header).samples;

      const frame = (yield* codecParser.readRawData(
        frameLength,
        readOffset
      )).subarray(0, frameLength);

      return new Frame(header, frame, samples);
    } else {
      return null;
    }
  }

  constructor(header, data, samples) {
    super(header, data);

    this.header = header;
    this.samples = samples;
    this.duration = (samples / this.header.sampleRate) * 1000;
    this.frameNumber = undefined;
    this.totalBytesOut = undefined;
    this.totalSamples = undefined;
    this.totalDuration = undefined;

    frameStore.get(this).length = this.data.length;
  }
}