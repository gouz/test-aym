import { AYM_MyModel } from "./aym-my-model";

window.startApp = async () => {
  const midiModel = new AYM_MyModel();
  await midiModel.powerOn();
};

/*
WebMidi.enable()
  .then(onEnabled)
  .catch((err) => alert(err));
*/
