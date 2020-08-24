import app from "flarum/app";
import { extend } from "flarum/extend";
import IndexPage from "flarum/components/IndexPage";
import DiscussionList from "flarum/components/DiscussionList";
import DiscussionListItem from "flarum/components/DiscussionListItem";
import Button from "flarum/components/Button";
import humanTime from "flarum/utils/humanTime";
import extractText from "flarum/utils/extractText";

export default function () {
  const searchChild = (el, className) => {
    if (!el || !className) return;
    return el.find(
      (v) =>
        v &&
        v.attrs &&
        v.attrs.className &&
        v.attrs.className.includes(className)
    );
  };
  const removeItem = (el, className) => {
    if (!el || !className) return;
    return el.filter(function (el) {
      if (
        el &&
        el.attrs &&
        el.attrs.className &&
        !el.attrs.className.includes(className)
      ) {
        return el;
      }
    });
  };
  const truncateString = (str, n = 175) => {
    return str.length > n ? str.substr(0, n - 1) + "..." : str;
  };

  extend(IndexPage.prototype, "view", function (vdom) {
    //TODO: check if we should remove it temporarly, just with discussionList, or let it be
    if (!vdom || !vdom.children || !app.cache.discussionList) return;

    let container = searchChild(vdom.children, "container");
    let sideNavContainer = searchChild(
      container.children || [],
      "sideNavContainer"
    );
    if (sideNavContainer && sideNavContainer.children) {
      sideNavContainer.children = removeItem(
        sideNavContainer.children,
        "IndexPage-nav"
      );
    }
  });

  extend(IndexPage.prototype, "actionItems", function (items) {
    if (!app.cache.discussionList) return;
    const canStartDiscussion =
      app.forum.attribute("canStartDiscussion") || !app.session.user;

    items.add(
      "newDiscussion",
      Button.component({
        children: app.translator.trans(
          canStartDiscussion
            ? "core.forum.index.start_discussion_button"
            : "core.forum.index.cannot_start_discussion_button"
        ),
        icon: "fas fa-edit",
        className: "Button Button--primary IndexPage-newDiscussion",
        itemClassName: "App-primaryControl",
        onclick: this.newDiscussionAction.bind(this),
        disabled: !canStartDiscussion,
      })
    );
  });

  extend(DiscussionListItem.prototype, "view", function (vdom) {
    if (!vdom || !vdom.children || !app.cache.discussionList) return;
    let content = searchChild(vdom.children, "DiscussionListItem-content");
    let mainItem = searchChild(
      content.children || [],
      "DiscussionListItem-main"
    );
    let itemInto = searchChild(
      mainItem.children || [],
      "DiscussionListItem-info"
    );

    let data = this.props.discussion.data.attributes || {};
    let userText;
    if (data.lastPostedAt) {
      let lastUser = this.props.discussion.lastPostedUser();
      userText = extractText(
        app.translator.trans("core.forum.discussion_list.replied_text", {
          user: lastUser,
          ago: humanTime(data.lastPostedAt),
        })
      );
    } else {
      let createUser = this.props.discussion.user();
      userText = extractText(
        app.translator.trans("core.forum.discussion_list.started_text", {
          user: createUser,
          ago: humanTime(data.createdAt),
        })
      );
    }

    let countItem = searchChild(content.children, "DiscussionListItem-count");
    if (countItem) {
      countItem.children = [{ ...countItem }];
      countItem.tag = "div";
      countItem.attrs = {
        className: "DiscussionList-column DiscussionList-replies",
      };

      let lastPostChild = [];
      lastPostChild.push(<span>{userText}</span>);
      content.children.push({
        tag: "div",
        attrs: {
          className: "DiscussionList-column DiscussionList-lastPost",
        },
        children: lastPostChild,
      });
    }
    if (itemInto && itemInto.children) {
      itemInto.children = removeItem(itemInto.children, "item-terminalPost");
      let firstPost = this.props.discussion.firstPost();
      let text = firstPost ? truncateString(firstPost.contentPlain()) : "";
      //TODO check layout for "back" in topics
      itemInto.children.push(<li class={`item-excerpt`}>{text}</li>);
    }
  });

  extend(DiscussionList.prototype, "view", function (vdom) {
    if (!vdom || !vdom.children) return;
    let columns = ["topic", "replies", "lastPost"];
    let discussHeader = {
      tag: "div",
      attrs: {
        className: "DiscussionList-header",
      },
      children: [],
    };
    columns.forEach((element) => {
      discussHeader.children.push(
        <div className={`DiscussionList-column DiscussionList-${element}`}>
          {app.translator.trans(
            "funkeye-fancy-discussion-list.forum.taglist." + element
          )}
        </div>
      );
    });
    vdom.children.unshift(discussHeader);
    return;
    /* add header to vdom.children => position 0
     */
    /*
        modify const content 
      */

    const content = vdom.children.find(
      (v) =>
        v &&
        v.attrs &&
        v.attrs.className &&
        v.attrs.className.includes("DiscussionList-discussions")
    );
    const discussion = this.props.discussion;
    const post = discussion.firstPost();

    const hasUpvoted = get(discussion, "hasUpvoted");
    const hasDownvoted = get(discussion, "hasDownvoted");
    const canVote = get(discussion, "canVote");

    const style = {
      color: app.forum.attribute("themePrimaryColor"),
    };

    const attrs = {
      disabled: !canVote,
    };

    const useAlternateLayout = setting("useAlternateLayout", true);

    content.children.unshift(
      <div
        className={`DiscussionListItem-votes ${
          useAlternateLayout && "alternateLayout"
        }`}
      >
        {icon("fas fa-arrow-up", {
          style: hasUpvoted ? style : {},
          onclick:
            canVote &&
            (() => saveVote(post, !hasUpvoted, false, null, discussion)),
          ...attrs,
        })}
        <span>{abbreviateNumber(get(discussion, "votes") || 0)}</span>
        {icon("fas fa-arrow-down", {
          style: hasDownvoted ? style : {},
          onclick:
            canVote &&
            (() => saveVote(post, false, !hasDownvoted, null, discussion)),
          ...attrs,
        })}
      </div>
    );

    // app.cache.discussionList = m(
    //   "div",
    //   { className: "DiscussionList" },
    //   m(
    //     "div",
    //     {
    //       className: "DiscussionList-header",
    //     },
    //     "header"
    //   ),
    //   m(
    //     "div",
    //     {
    //       className: "DiscussionList-discussions",
    //     },
    //     "body"
    //   ),
    //   m(
    //     "div",
    //     {
    //       className: "DiscussionList-loadMore",
    //     },
    //     "button"
    //   )
    // );
    // m(
    //   "div",
    //   { className: "DiscussionPage-discussion Test" },
    //   discussion
    //     ? [
    //         DiscussionHero.component({ discussion: discussion }),
    //         m(
    //           "div",
    //           { className: "container test" },
    //           m(
    //             "nav",
    //             { className: "DiscussionPage-nav" },
    //             m("ul", null, listItems(this.sidebarItems().toArray()))
    //           ),
    //           m(
    //             "div",
    //             { className: "DiscussionPage-stream" },
    //             this.stream.render()
    //           )
    //         ),
    //       ]
    //     : LoadingIndicator.component({
    //         className: "LoadingIndicator--block",
    //       })
    // )
  });
}
