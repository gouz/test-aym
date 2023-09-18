import { WebMidi } from "webmidi";
import { AYM_MidiModel } from "./aymjs/aym-midi-model";

const midiModel = new AYM_MidiModel();

midiModel.powerOn();

const getFrequency = (note) => {
  const notes = [
    "A",
    "A#",
    "B",
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
  ];
  let octave, keyNumber;

  if (note.length === 3) {
    octave = note.charAt(2);
  } else {
    octave = note.charAt(1);
  }

  keyNumber = notes.indexOf(note.slice(0, -1));

  if (keyNumber < 3) {
    keyNumber = keyNumber + 12 + (octave - 1) * 12 + 1;
  } else {
    keyNumber = keyNumber + (octave - 1) * 12 + 1;
  }

  return 440 * Math.pow(2, (keyNumber - 49) / 12);
};

WebMidi.enable()
  .then(onEnabled)
  .catch((err) => alert(err));

// Function triggered when WEBMIDI.js is ready
function onEnabled() {
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
      midiModel.sendMessage({ freq });
    });
  }
}
