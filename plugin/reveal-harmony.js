/* Reveal.js plugin: Harmony Viewer integration
   - Activates ONLY the iframe on the current slide
   - Deactivates all other Harmony iframes (prevents MIDI accumulation)
   - Auto-resizes iframe AND slide section correctly
*/

(function () {
  window.RevealHarmony = {
    id: "harmony",

    init: function (deck) {
      console.log("[RevealHarmony] plugin initialized");

      /* -------------------------------------------------
         CSS hard overrides (Reveal normally fights this)
      ------------------------------------------------- */
      const style = document.createElement("style");
      style.textContent = `
        /* Prevent Reveal from clipping Harmony slides */
        .reveal,
        .reveal .slides {
          overflow: visible !important;
        }

        .reveal section {
          overflow: visible !important;
        }

        iframe[data-harmony] {
          width: 100% !important;
          border: 0 !important;
          outline: 0 !important;
          box-shadow: none !important;
          background: transparent !important;
          display: block;
        }

        /* Disable Reveal vertical centering on harmony slides */
        section[data-harmony-slide] {
          display: block !important;
        }
      `;
      document.head.appendChild(style);

      /* -------------------------------------------------
         Helpers
      ------------------------------------------------- */
      function getHarmonyIframes() {
        return Array.from(document.querySelectorAll("iframe[data-harmony]"));
      }

      function activateCurrentIframe() {
        const current = deck.getCurrentSlide();
        const indices = deck.getIndices();
        const slideIndex = indices && typeof indices.h === "number" ? indices.h : 0;

        for (const iframe of getHarmonyIframes()) {
          if (!iframe.contentWindow) continue;

          const isActive = current && current.contains(iframe);

          iframe.contentWindow.postMessage(
            {
              type: isActive ? "activate" : "deactivate",
              slideIndex
            },
            "*"
          );

          const section = iframe.closest("section");
          if (section) {
            if (isActive) {
              section.setAttribute("data-harmony-slide", "true");
            } else {
              section.removeAttribute("data-harmony-slide");
            }
          }
        }
      }

      /* -------------------------------------------------
         Reveal lifecycle hooks
      ------------------------------------------------- */
      deck.on("ready", activateCurrentIframe);
      deck.on("slidechanged", activateCurrentIframe);
      deck.on("fragmentshown", activateCurrentIframe);
      deck.on("fragmenthidden", activateCurrentIframe);

      /* -------------------------------------------------
         Resize handling from viewer
      ------------------------------------------------- */
      window.addEventListener("message", (event) => {
        const msg = event.data;
        if (!msg || typeof msg !== "object") return;
        if (msg.type !== "harmony-resize") return;

        const iframe = getHarmonyIframes().find(
          (f) => f.contentWindow === event.source
        );
        if (!iframe) return;

        const height = Number(msg.height);
        if (!height || height <= 0) return;

        // 1. Resize iframe
        iframe.style.height = `${height}px`;

        // 2. Resize section itself (THIS IS THE KEY FIX)
        const section = iframe.closest("section");
        if (section) {
          section.style.height = `${height}px`;
          section.style.minHeight = `${height}px`;
          section.style.maxHeight = "none";
          section.style.overflow = "visible";

          // Disable Reveal scaling transforms
          section.style.transform = "none";
        }

        // 3. Force Reveal layout refresh
        if (typeof deck.layout === "function") {
          deck.layout();
        }
      });
    }
  };
})();
