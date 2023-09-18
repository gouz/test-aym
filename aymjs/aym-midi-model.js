/*
 * aym-player-model.js - Copyright (c) 2001-2023 - Olivier Poncet
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { AYM_Utils } from "./aym-utils.js";

// ---------------------------------------------------------------------------
// AYM_PlayerModel
// ---------------------------------------------------------------------------

export class AYM_MidiModel {
  constructor() {
    this.waContext = null;
    this.waGain = null;
    this.waWorklet = null;
  }

  async powerOn() {
    await this.createContext();
    await this.createGain();
    await this.createWorklet();
  }

  async powerOff() {
    await this.destroyWorklet();
    await this.destroyGain();
    await this.destroyContext();
  }

  async createContext() {
    if (this.waContext == null) {
      this.waContext = new AudioContext();
      await this.waContext.audioWorklet.addModule(
        "aymjs/aym-midi-processor.js"
      );
    }
  }

  async destroyContext() {
    if (this.waContext != null) {
      await this.waContext.close();
      this.waContext = null;
    }
  }

  async createGain() {
    if (this.waGain == null) {
      this.waGain = new GainNode(this.waContext);
      this.waGain.connect(this.waContext.destination);
    }
  }

  async destroyGain() {
    if (this.waGain != null) {
      this.waGain.disconnect();
      this.waGain = null;
    }
  }

  async createWorklet() {
    if (this.waWorklet == null) {
      const audioWorkletProcessorOptions = {
        unused: null,
      };
      const audioWorkletNodeOptions = {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        processorOptions: audioWorkletProcessorOptions,
      };
      this.waWorklet = new AudioWorkletNode(
        this.waContext,
        "aym-midi-processor",
        audioWorkletNodeOptions
      );
      this.waWorklet.connect(this.waGain);
    }
  }

  async destroyWorklet() {
    if (this.waWorklet != null) {
      this.waWorklet.disconnect();
      this.waWorklet = null;
    }
  }

  isPowered() {
    if (this.waWorklet != null) {
      return true;
    }
    return false;
  }

  isNotPowered() {
    if (this.waWorklet == null) {
      return true;
    }
    return false;
  }

  setGain(gain) {
    if (this.waGain != null) {
      this.waGain.gain.value = AYM_Utils.clamp_flt(gain, 0.0, 1.0);
    }
  }

  sendMessage(type = null, data = null) {
    if (this.waWorklet != null) {
      this.waWorklet.port.postMessage({
        message_type: type,
        message_data: data,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// End-Of-File
// ---------------------------------------------------------------------------
