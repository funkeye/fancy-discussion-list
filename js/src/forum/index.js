import app from "flarum/app";
import customDiscussionList from "./customDiscussionList";

app.initializers.add("funkeye/fancy-discussion-list", () => {
  customDiscussionList();
});
