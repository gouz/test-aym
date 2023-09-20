import { WebMidi } from "webmidi";
import { AYM_MyModel } from "./aym-my-model";
import { getFrequency } from "./js/utils";

const midiModel = new AYM_MyModel();

window.startApp = async () => {
  await midiModel.powerOn();
};

WebMidi.enable()
  .then(() => {
    // Display available MIDI input devices
    if (WebMidi.inputs.length < 1) {
      document.body.innerHTML += "No device detected.";
    } else {
      WebMidi.inputs.forEach((device, index) => {
        document.body.innerHTML += `${index}: ${device.name} <br>`;
      });

      const mySynth = WebMidi.inputs[0];
      // const mySynth = WebMidi.getInputByName("TYPE NAME HERE!")

      mySynth.channels[1].addListener("noteon", (e) => {
        const note = `${e.note.name}${e.note.accidental || ""}${e.note.octave}`;
        const freq = getFrequency(note);
        document.body.innerHTML += `${note} : ${freq}<br>`;
        midiModel.sendNoteOn(0, freq, 10);
        midiModel.sendNoteOn(1, freq, 10);
        midiModel.sendNoteOn(2, freq, 10);
      });

      mySynth.channels[1].addListener("noteoff", (e) => {
        midiModel.sendNoteOff(0);
        midiModel.sendNoteOff(1);
        midiModel.sendNoteOff(2);
      });
    }
  })
  .catch((err) => alert(err));
