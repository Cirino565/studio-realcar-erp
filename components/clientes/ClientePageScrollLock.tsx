"use client";

import { useEffect } from "react";

export default function ClientePageScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const main = document.querySelector("main");

    const previous = {
      htmlOverflowX: html.style.overflowX,
      htmlOverscrollX: html.style.overscrollBehaviorX,
      htmlTouchAction: html.style.touchAction,
      bodyOverflowX: body.style.overflowX,
      bodyOverscrollX: body.style.overscrollBehaviorX,
      bodyTouchAction: body.style.touchAction,
      mainOverflowX: main?.style.overflowX ?? "",
      mainOverscrollX: main?.style.overscrollBehaviorX ?? "",
      mainTouchAction: main?.style.touchAction ?? "",
      mainMaxWidth: main?.style.maxWidth ?? "",
    };

    html.style.overflowX = "hidden";
    html.style.overscrollBehaviorX = "none";
    html.style.touchAction = "pan-y";

    body.style.overflowX = "hidden";
    body.style.overscrollBehaviorX = "none";
    body.style.touchAction = "pan-y";

    if (main) {
      main.style.overflowX = "hidden";
      main.style.overscrollBehaviorX = "none";
      main.style.touchAction = "pan-y";
      main.style.maxWidth = "100vw";
    }

    return () => {
      html.style.overflowX = previous.htmlOverflowX;
      html.style.overscrollBehaviorX = previous.htmlOverscrollX;
      html.style.touchAction = previous.htmlTouchAction;

      body.style.overflowX = previous.bodyOverflowX;
      body.style.overscrollBehaviorX = previous.bodyOverscrollX;
      body.style.touchAction = previous.bodyTouchAction;

      if (main) {
        main.style.overflowX = previous.mainOverflowX;
        main.style.overscrollBehaviorX = previous.mainOverscrollX;
        main.style.touchAction = previous.mainTouchAction;
        main.style.maxWidth = previous.mainMaxWidth;
      }
    };
  }, []);

  return null;
}
