import EventEmitter from "events";
import TypedEventEmitter, { EventMap } from "typed-emitter";
import { Events } from "./types";

/**
 * Event emitter type for Chatbot.
 * Provides a less cluttered interface.
 */
export type SimplifiedEventEmitter<Events extends EventMap> = Pick<
  TypedEventEmitter<Events>,
  "on" | "once" | "off" | "emit"
>;

/**
 * Extended event emitter for Chatbot.
 */
class ChatbotEventEmitter implements SimplifiedEventEmitter<Events> {
  readonly emitter: TypedEventEmitter<Events> =
    new EventEmitter() as TypedEventEmitter<Events>;

  on = this.emitter.on.bind(this.emitter);
  once = this.emitter.once.bind(this.emitter);
  off = this.emitter.off.bind(this.emitter);
  emit = this.emitter.emit.bind(this.emitter);

  /**
   * Attach a callback to a specific event.
   * @param listener Callback function that will be called when the event is emitted.
   * It can return false to unsubscribe.
   */
  onUntilFalse<E extends keyof Events>(
    event: E,
    listener: (...args: Parameters<Events[E]>) => boolean | void,
  ) {
    const wrappedListener = (...args: Parameters<Events[E]>) => {
      const result = listener(...args);
      if (result === false) {
        this.off(event, wrappedListener as Events[E]);
      }
    };

    this.on(event, wrappedListener as Events[E]);
    return this;
  }
}

export default ChatbotEventEmitter;
