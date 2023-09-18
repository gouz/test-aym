/*
 * aym-player-processor.js - Copyright (c) 2001-2023 - Olivier Poncet
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

import { AYM_Emulator } from "./aym-emulator.js";

// ---------------------------------------------------------------------------
// Some useful constants
// ---------------------------------------------------------------------------

const AYM_FLAG_RESET = 0x01;
const AYM_FLAG_PAUSE = 0x02;
const AYM_FLAG_MUTEA = 0x10;
const AYM_FLAG_MUTEB = 0x20;
const AYM_FLAG_MUTEC = 0x40;

// ---------------------------------------------------------------------------
// AYM_Processor
// ---------------------------------------------------------------------------

export class AYM_MidiProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chip = new AYM_Emulator({});
    this.chip_flags = 0;
    this.chip_ticks = 0;
    this.chip_clock = 0;
    this.music_index = -1;
    this.music_count = 0;
    this.music_ticks = 0;
    this.music_clock = 0;
    this.channel_a = null;
    this.channel_b = null;
    this.channel_c = null;
    this.port.onmessage = (message) => {
      this.recvMessage(message);
    };
  }

  sendMessage(type = null, data = null) {
    this.port.postMessage({ message_type: type, message_data: data });
  }

  recvMessage(message) {
    const payload = message.data;
    console.log(message);
    this.chip.set_register_index(0);
    this.chip.set_register_value(payload.freq);
  }

  recvPlay() {
    this.chip_flags |= AYM_FLAG_RESET;
    this.music_index = 0;
    this.music_count = 1000;
    this.music_ticks = 0;
    this.music_clock = 100;
  }

  recvStop() {
    this.chip_flags |= AYM_FLAG_RESET;
    this.music_index = -1;
    this.music_count = 0;
    this.music_ticks = 0;
    this.music_clock = 0;
  }

  hasReset() {
    if ((this.chip_flags & AYM_FLAG_RESET) != 0) {
      this.chip_flags &= ~AYM_FLAG_RESET;
      this.chip_ticks &= 0;
      this.chip.reset();
      return true;
    }
    return false;
  }

  hasPause() {
    if ((this.chip_flags & AYM_FLAG_PAUSE) != 0) {
      return true;
    }
    return false;
  }

  process(inputs, outputs, parameters) {
    if (this.hasReset() || this.hasPause()) {
      return true;
    }

    const numSamples = () => {
      if (outputs.length > 0) {
        const output0 = outputs[0];
        if (output0.length > 0) {
          const channel0 = output0[0];
          if (channel0.length > 0) {
            return channel0.length;
          }
        }
      }
      return 128;
    };

    const getChannelA = (samples) => {
      if (this.channel_a == null || this.channel_a.length < samples) {
        this.channel_a = new Float32Array(samples);
      }
      return this.channel_a;
    };

    const getChannelB = (samples) => {
      if (this.channel_b == null || this.channel_b.length < samples) {
        this.channel_b = new Float32Array(samples);
      }
      return this.channel_b;
    };

    const getChannelC = (samples) => {
      if (this.channel_c == null || this.channel_c.length < samples) {
        this.channel_c = new Float32Array(samples);
      }
      return this.channel_c;
    };

    const clockMusic = () => {
      this.music_ticks += this.music_clock;
      if (this.music_ticks >= this.chip_clock) {
        this.music_ticks -= this.chip_clock;
        for (let index = 0; index < 14; ++index) {
          const value = frame[index];
          if (index == 13 && value == 0xff) {
            continue;
          }
          this.chip.set_register_index(index);
          this.chip.set_register_value(440);
        }
      }
    };

    const clockChip = () => {
      while (this.chip_ticks < this.chip_clock) {
        this.chip_ticks += sampleRate;
        this.chip.clock();
        clockMusic();
      }
      this.chip_ticks -= this.chip_clock;
    };

    const samples = numSamples();
    const channel_a = getChannelA(samples);
    const channel_b = getChannelB(samples);
    const channel_c = getChannelC(samples);
    for (let sample = 0; sample < samples; ++sample) {
      channel_a[sample] = this.chip.get_channel0();
      channel_b[sample] = this.chip.get_channel1();
      channel_c[sample] = this.chip.get_channel2();
      clockChip();
    }

    const mixMono = (channel) => {
      for (let sample = 0; sample < samples; ++sample) {
        let output = 0;
        if ((this.chip_flags & AYM_FLAG_MUTEA) == 0) {
          output += channel_a[sample];
        }
        if ((this.chip_flags & AYM_FLAG_MUTEB) == 0) {
          output += channel_b[sample];
        }
        if ((this.chip_flags & AYM_FLAG_MUTEC) == 0) {
          output += channel_c[sample];
        }
        output /= 3.0;
        channel[sample] = output * 2.0 - 1.0;
      }
    };

    const mixStereo = (channel1, channel2) => {
      for (let sample = 0; sample < samples; ++sample) {
        let output1 = 0;
        let output2 = 0;
        if ((this.chip_flags & AYM_FLAG_MUTEA) == 0) {
          output1 += channel_a[sample] * 0.75;
          output2 += channel_a[sample] * 0.25;
        }
        if ((this.chip_flags & AYM_FLAG_MUTEB) == 0) {
          output1 += channel_b[sample] * 0.5;
          output2 += channel_b[sample] * 0.5;
        }
        if ((this.chip_flags & AYM_FLAG_MUTEC) == 0) {
          output1 += channel_c[sample] * 0.25;
          output2 += channel_c[sample] * 0.75;
        }
        output1 /= 1.5;
        output2 /= 1.5;
        channel1[sample] = output1 * 2.0 - 1.0;
        channel2[sample] = output2 * 2.0 - 1.0;
      }
    };

    for (const output of outputs) {
      if (output.length >= 2) {
        mixStereo(output[0], output[1]);
        continue;
      }
      if (output.length >= 1) {
        mixMono(output[0]);
        continue;
      }
    }
    return true;
  }
}

// ---------------------------------------------------------------------------
// register AYM_PlayerProcessor
// ---------------------------------------------------------------------------

registerProcessor("aym-midi-processor", AYM_MidiProcessor);

// ---------------------------------------------------------------------------
// End-Of-File
// ---------------------------------------------------------------------------
