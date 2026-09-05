// =========================================================
// 1. AI RESPONSE ACTION TOOLBAR
// =========================================================

function buildMessageActions(text, extra = {}, role = "assistant", messageWrapper = null) {
  const bar = document.createElement("div");
  bar.className = "msg-actions";

  // COPY
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.title = "Copy";
  copyBtn.setAttribute("aria-label", "Copy response");

  copyBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14">
      <path fill="currentColor"
        d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/>
    </svg>
  `;

  copyBtn.addEventListener("click", async () => {
    const value = extra.imageUrl || text || "";

    try {
      await navigator.clipboard.writeText(value);

      copyBtn.title = "Copied!";

      setTimeout(() => {
        copyBtn.title = "Copy";
      }, 1400);

    } catch (error) {
      console.error("Copy failed:", error);
    }
  });


  // LIKE
  const likeBtn = document.createElement("button");

  likeBtn.type = "button";
  likeBtn.title = "Good response";
  likeBtn.setAttribute("aria-label", "Good response");

  likeBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14">
      <path fill="currentColor"
        d="M2 21h4V9H2v12Zm20-11c0-1.1-.9-2-2-2h-5.5l.8-4.1c.1-.5 0-1-.4-1.4L14 1l-7 7v11h11c.8 0 1.5-.5 1.8-1.2l2-5c.1-.3.2-.6.2-.8V10Z"/>
    </svg>
  `;


  // DISLIKE
  const dislikeBtn = document.createElement("button");

  dislikeBtn.type = "button";
  dislikeBtn.title = "Bad response";
  dislikeBtn.setAttribute("aria-label", "Bad response");

  dislikeBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14">
      <path fill="currentColor"
        d="M22 3h-4v12h4V3Zm-6 0H7c-.8 0-1.5.5-1.8 1.2l-2 5c-.1.3-.2.6-.2.8v1c0 1.1.9 2 2 2h5.5l-.8 4.1c-.1.5 0 1 .4 1.4L12 23l7-7V5h-3V3Z"/>
    </svg>
  `;


  likeBtn.addEventListener("click", () => {

    likeBtn.classList.toggle("active-feedback-up");

    dislikeBtn.classList.remove(
      "active-feedback-down"
    );

  });


  dislikeBtn.addEventListener("click", () => {

    dislikeBtn.classList.toggle(
      "active-feedback-down"
    );

    likeBtn.classList.remove(
      "active-feedback-up"
    );

  });


  // SHARE
  const shareBtn = document.createElement("button");

  shareBtn.type = "button";
  shareBtn.title = "Share";
  shareBtn.setAttribute("aria-label", "Share response");

  shareBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14">
      <path fill="currentColor"
        d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7
        c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11
        c.54.5 1.25.81 2.04.81a3 3 0 1 0-3-3
        c0 .24.04.47.09.7L8.04 9.81A3 3 0 1 0 6 14.7
        l7.13 4.15c-.05.21-.08.43-.08.65a2.99 2.99 0 1 0 4.95-2.42Z"/>
    </svg>
  `;


  shareBtn.addEventListener("click", async () => {

    const shareText = extra.imageUrl || text || "";

    if (navigator.share) {

      try {

        await navigator.share({
          title: "Aura AI",
          text: shareText
        });

      } catch (error) {
        // User cancelled share
      }

    } else {

      try {

        await navigator.clipboard.writeText(
          shareText
        );

        shareBtn.title = "Copied!";

        setTimeout(() => {
          shareBtn.title = "Share";
        }, 1400);

      } catch (error) {}

    }

  });


  // READ ALOUD
  if (!extra.imageUrl) {

    const speakBtn = document.createElement("button");

    speakBtn.type = "button";
    speakBtn.title = "Read aloud";
    speakBtn.setAttribute(
      "aria-label",
      "Read response aloud"
    );

    speakBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14">
        <path fill="currentColor"
          d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3
          a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12Z"/>
      </svg>
    `;

    speakBtn.addEventListener("click", () => {
      speakText(text);
    });

    bar.appendChild(speakBtn);

  }


  bar.appendChild(likeBtn);
  bar.appendChild(dislikeBtn);
  bar.appendChild(copyBtn);
  bar.appendChild(shareBtn);

  return bar;
}



// =========================================================
// 2. USER MESSAGE ACTIONS
// =========================================================

function buildUserMessageActions(text, messageWrapper) {

  const bar = document.createElement("div");

  bar.className =
    "msg-actions user-msg-actions";


  // EDIT BUTTON
  const editBtn = document.createElement("button");

  editBtn.type = "button";
  editBtn.title = "Edit";
  editBtn.setAttribute(
    "aria-label",
    "Edit message"
  );

  editBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14">
      <path fill="currentColor"
        d="m14.06 9.02.92.92L5.92 19H5v-.92l9.06-9.06ZM17.71 3
        a1 1 0 0 1 .71.29l2.29 2.29a1 1 0 0 1 0 1.42
        l-11.7 11.7A1 1 0 0 1 8.3 19H4a1 1 0 0 1-1-1v-4.3
        a1 1 0 0 1 .29-.71L14.29 3.3A1 1 0 0 1 15 3h2.71Z"/>
    </svg>
  `;


  // COPY BUTTON
  const copyBtn = document.createElement("button");

  copyBtn.type = "button";
  copyBtn.title = "Copy";
  copyBtn.setAttribute(
    "aria-label",
    "Copy message"
  );

  copyBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14">
      <path fill="currentColor"
        d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8
        a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11
        a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/>
    </svg>
  `;


  copyBtn.addEventListener("click", async () => {

    try {

      await navigator.clipboard.writeText(
        text || ""
      );

      copyBtn.title = "Copied!";

      setTimeout(() => {
        copyBtn.title = "Copy";
      }, 1200);

    } catch (error) {}

  });


  // EDIT
  editBtn.addEventListener("click", () => {

    const conv = getActiveConversation();

    if (!conv || !messageWrapper) return;

    const bubble =
      messageWrapper.querySelector(".bubble");

    if (!bubble) return;


    const editor =
      document.createElement("textarea");

    editor.className =
      "message-edit-input";

    editor.value = text || "";

    editor.rows = 4;


    const controls =
      document.createElement("div");

    controls.className =
      "message-edit-controls";


    const cancelBtn =
      document.createElement("button");

    cancelBtn.type = "button";

    cancelBtn.className =
      "edit-cancel";

    cancelBtn.textContent =
      "Cancel";


    const saveBtn =
      document.createElement("button");

    saveBtn.type = "button";

    saveBtn.className =
      "edit-save";

    saveBtn.textContent =
      "Save";


    controls.appendChild(cancelBtn);
    controls.appendChild(saveBtn);


    bubble.innerHTML = "";

    bubble.appendChild(editor);
    bubble.appendChild(controls);


    editor.focus();

    editor.setSelectionRange(
      editor.value.length,
      editor.value.length
    );


    // CANCEL
    cancelBtn.addEventListener("click", () => {

      bubble.textContent =
        text || "";

    });


    // SAVE
    saveBtn.addEventListener("click", () => {

      const newText =
        editor.value.trim();

      if (!newText) return;


      const userMessages =
        (conv.messages || [])
          .map((message, index) => ({
            message,
            index
          }))
          .filter(
            item =>
              item.message.role === "user"
          );


      const messageElements =
        Array.from(
          chatMessagesInner.querySelectorAll(
            ".message-user"
          )
        );


      const messageIndex =
        messageElements.indexOf(
          messageWrapper
        );


      const target =
        userMessages[messageIndex];


      if (target) {

        target.message.text =
          newText;

      }


      bubble.textContent =
        newText;


      saveConversationsToStorage();

    });

  });


  bar.appendChild(editBtn);
  bar.appendChild(copyBtn);


  return bar;
}



// =========================================================
// 3. MESSAGE RENDERING ACTIONS
// =========================================================

if (role === "user") {

  wrapper.appendChild(
    buildUserMessageActions(
      text,
      wrapper
    )
  );


  wrapper.addEventListener(
    "click",
    (event) => {

      if (
        window.matchMedia &&
        window.matchMedia(
          "(hover: none)"
        ).matches
      ) {

        if (
          !event.target.closest("button")
        ) {

          document
            .querySelectorAll(
              ".message-user.actions-visible"
            )
            .forEach((el) => {

              if (el !== wrapper) {

                el.classList.remove(
                  "actions-visible"
                );

              }

            });


          wrapper.classList.toggle(
            "actions-visible"
          );

        }

      }

    }
  );


} else {

  wrapper.appendChild(
    buildMessageActions(
      text,
      extra,
      "assistant",
      wrapper
    )
  );

}



// =========================================================
// 4. SMART CHAT SCROLLING
// =========================================================

function isNearChatBottom(
  threshold = 140
) {

  if (!chatWindow) return true;

  return (
    chatWindow.scrollHeight -
    chatWindow.scrollTop -
    chatWindow.clientHeight
  ) <= threshold;

}


function scrollToBottom(
  force = false
) {

  if (!chatWindow) return;

  if (
    !force &&
    !isNearChatBottom()
  ) {
    return;
  }


  requestAnimationFrame(() => {

    chatWindow.scrollTo({

      top:
        chatWindow.scrollHeight,

      behavior:
        "smooth"

    });

  });

}



// =========================================================
// 5. ADD MESSAGE
// =========================================================

function addMessage(
  role,
  text,
  extra = {}
) {

  const shouldStickToBottom =
    isNearChatBottom(160);


  renderMessageBubble(
    role,
    text,
    extra
  );


  scrollToBottom(
    shouldStickToBottom
  );


  const conv =
    getActiveConversation();


  if (conv) {

    conv.messages =
      conv.messages || [];


    conv.messages.push({

      role,
      text,

      ...extra

    });


    saveConversationsToStorage();

  }

}



// =========================================================
// 6. AURA AI LOGO
// =========================================================

function upgradeAuraLogo() {

  const logo =
    document.querySelector(
      ".brand-logo"
    );


  if (!logo) return;


  logo.innerHTML = `
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >

      <path
        fill="currentColor"
        d="
        M16 3.2
        c2.15 0 4.02 1.28 4.86 3.13
        a5.7 5.7 0 0 1 5.82 5.82
        A5.34 5.34 0 0 1 29.8 17
        c0 2.15-1.28 4.02-3.13 4.86
        a5.7 5.7 0 0 1-5.82 5.82
        A5.34 5.34 0 0 1 16 29.8
        a5.34 5.34 0 0 1-4.86-2.12
        a5.7 5.7 0 0 1-5.82-5.82
        A5.34 5.34 0 0 1 2.2 17
        c0-2.15 1.28-4.02 3.13-4.86
        a5.7 5.7 0 0 1 5.82-5.82
        A5.34 5.34 0 0 1 16 3.2Z

        M11.76 10.56
        a2.86 2.86 0 0 0-2.86 2.86
        v2.1H6.8
        a2.84 2.84 0 1 0 0 5.68
        h2.1v2.1
        a2.86 2.86 0 0 0 5.72 0
        v-2.1h2.1
        a2.84 2.84 0 1 0 0-5.68
        h-2.1v-2.1
        a2.86 2.86 0 0 0-2.86-2.86Z

        M20.24 10.56
        a2.86 2.86 0 0 0-2.86 2.86
        v2.1h-2.1
        a2.84 2.84 0 1 0 0 5.68
        h2.1v2.1
        a2.86 2.86 0 0 0 5.72 0
        v-2.1h2.1
        a2.84 2.84 0 1 0 0-5.68
        h-2.1v-2.1
        a2.86 2.86 0 0 0-2.86-2.86Z
        "
      />

    </svg>
  `;

}


if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    upgradeAuraLogo,
    { once: true }
  );

} else {

  upgradeAuraLogo();

}
