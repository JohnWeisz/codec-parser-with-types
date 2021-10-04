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

import { isParsedStore, frameStore } from "../globals.js";
import HeaderCache from "./HeaderCache.js";

/**
 * @abstract
 * @description Abstract class containing methods for parsing codec frames
 */
export default class Parser {
  constructor(onCodecUpdate) {
    this._headerCache = new HeaderCache(onCodecUpdate);
  }

  syncFrame(data, remainingData = 0) {
    let frame = new this.Frame(data.subarray(remainingData), this._headerCache);

    while (!frameStore.get(frame).header && remainingData < data.length) {
      remainingData += frameStore.get(frame).length || 1;
      frame = new this.Frame(data.subarray(remainingData), this._headerCache);
    }

    return { frame, remainingData };
  }

  /**
   * @description Searches for Frames within bytes containing a sequence of known codec frames.
   * @param {Uint8Array} data Codec data that should contain a sequence of known length frames.
   * @returns {object} Object containing the actual offset and frame. Frame is undefined if no valid header was found
   */
  fixedLengthFrameSync(data) {
    // initial sync
    let { frame, remainingData } = this.syncFrame(data);
    let frames = [];

    while (
      isParsedStore.get(frameStore.get(frame).header) && // was there enough data to parse the header
      frameStore.get(frame).length + remainingData < data.length // is there enough data left to form a frame and check the next frame
    ) {
      // check if there is a valid frame immediately after this frame
      const nextFrame = new this.Frame(
        data.subarray(frameStore.get(frame).length + remainingData),
        this._headerCache
      );

      if (frameStore.get(nextFrame).header) {
        if (!isParsedStore.get(frameStore.get(nextFrame).header)) break; // out of data

        // start caching when synced
        this._headerCache.enable();

        // there is a next frame, so the current frame is valid
        frames.push(frame);
        remainingData += frameStore.get(frame).length;
        frame = nextFrame;
      } else {
        // frame is invalid and must re-sync and clear cache
        this._headerCache.reset();

        const syncResult = this.syncFrame(data, remainingData + 1); // increment to invalidate the invalid frame
        remainingData = syncResult.remainingData;
        frame = syncResult.frame;
      }
    }

    return {
      frames,
      remainingData,
    };
  }
}
