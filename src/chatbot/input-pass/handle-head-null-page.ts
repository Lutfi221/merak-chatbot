import InputPass from "./InputPass";

const handleHeadNullPage: InputPass = async (
  input,
  _,
  next,
  chatbot,
  setGoTo,
) => {
  if (chatbot.head.page !== null) {
    next();
    return;
  }
  if (!chatbot.data.triggers) {
    setGoTo("/start");
    return;
  }

  const caseSensitive = chatbot.data.settings?.caseSensitiveTrigger;
  let compare: (a: string, b: string) => boolean;

  if (caseSensitive) {
    compare = (a, b) => a === b;
  } else {
    compare = (a, b) => a.toLowerCase() === b.toLowerCase();
  }

  for (let trigger in chatbot.data.triggers!) {
    if (compare(trigger, input)) {
      setGoTo(chatbot.data.triggers[trigger]);
      return;
    }
  }
};

export default handleHeadNullPage;
