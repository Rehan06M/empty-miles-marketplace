
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowUpRight,
  CalendarCheck,
  IndianRupee,
  Leaf,
  MapPinned,
  Truck,
} from "lucide-react";

import "./FreightScrollHero.css";

const CLIP_VIEWPORTS = 2.4;
const CLIP_DURATION = 4.04;
const AUTO_INTRO_DURATION = 10000; // 13 seconds

const features = [
  {
    icon: MapPinned,
    title: "SMART ROUTE\nMATCHING",
    body: "Find freight opportunities along existing truck journeys, including partial routes and compatible detours.",
  },
  {
    icon: Truck,
    title: "EMPTY TRUCK\nCAPACITY",
    body: "Make better use of unused space on scheduled and return journeys.",
  },
  {
    icon: CalendarCheck,
    title: "FLEXIBLE\nBOOKINGS",
    body: "Request available capacity and confirm shipments with carrier approval.",
  },
  {
    icon: IndianRupee,
    title: "TRANSPARENT\nPRICING",
    body: "Compare marketplace estimates with dedicated-trip alternatives before booking.",
  },
  {
    icon: Leaf,
    title: "FEWER EMPTY\nMILES",
    body: "Estimate the potential emissions benefit of using capacity already on the road.",
  },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function FreightScrollHero() {
  const trackRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLDivElement>(null);

  // const [mediaError, setMediaError] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const update = () => setReducedMotion(query.matches);
    update();

    query.addEventListener("change", update);

    return () => {
      query.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const scene = sceneRef.current;
    const video = videoRef.current;
    const strip = stripRef.current;
    const letters = lettersRef.current;

    if (!track || !scene || !video || !strip || !letters) {
      return;
    }

    let frame = 0;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let stripViewports = 3;
    let stripWidth = 0;
    let lettersWidth = 0;
    let lastScrollY = window.scrollY;
    let lastTimestamp = performance.now();
    let smoothSpeed = 0;
    let currentTime = 0;
    let targetTime = 0;
    let disposed = false;
    let pendingSeek = false;
    let autoIntroActive =
      !reducedMotion &&
      window.scrollY < 10;

    let autoIntroStart: number | null = null;

    const getTrackScroll = () => {
      const trackTop =
        track.getBoundingClientRect().top +
        window.scrollY;

      return Math.max(0, window.scrollY - trackTop);
    };

    const resize = () => {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;

      const portrait =
        viewportWidth < 768 ||
        viewportWidth <= viewportHeight;

      let clipWidth: number;
      let clipHeight: number;
      let clipLeft: number;
      let clipTop: number;

      if (portrait) {
        clipWidth = viewportWidth * 1.55;
        clipHeight = clipWidth * (1080 / 1920);

        // Place 40% of the video frame at screen center.
        clipLeft = viewportWidth / 2 - clipWidth * 0.4;

        // Frame the final black-band edge at 36% of viewport.
        clipTop =
          viewportHeight * 0.36 -
          clipHeight * 0.448;
      } else {
        const scale = Math.max(
          viewportWidth / 1920,
          viewportHeight / 1080
        );

        clipWidth = 1920 * scale;
        clipHeight = 1080 * scale;
        clipLeft = (viewportWidth - clipWidth) / 2;
        clipTop = (viewportHeight - clipHeight) / 2;
      }

      video.style.width = `${clipWidth}px`;
      video.style.height = `${clipHeight}px`;
      video.style.left = `${clipLeft}px`;
      video.style.top = `${clipTop}px`;

      const edge = clipTop + clipHeight * 0.448;

      scene.style.setProperty(
        "--edge-px",
        `${edge}px`
      );

      stripWidth = strip.scrollWidth;
      lettersWidth = letters.scrollWidth;

      stripViewports =
        ((stripWidth + viewportWidth * 0.45) /
          viewportWidth) *
        1.1;

      track.style.height = `${(1 + CLIP_VIEWPORTS + stripViewports) *
        viewportHeight
        }px`;
    };

    const onSeeked = () => {
      pendingSeek = false;
    };

    const stopAutoIntro = () => {
      autoIntroActive = false;
    };

    const stopOnKey = (event: KeyboardEvent) => {
      if (
        [
          "ArrowDown",
          "ArrowUp",
          "PageDown",
          "PageUp",
          "Home",
          "End",
          " ",
        ].includes(event.key)
      ) {
        stopAutoIntro();
      }
    };

    window.addEventListener("wheel", stopAutoIntro, {
      passive: true,
    });

    window.addEventListener("touchstart", stopAutoIntro, {
      passive: true,
    });

    window.addEventListener("pointerdown", stopAutoIntro);

    window.addEventListener("keydown", stopOnKey);

    video.addEventListener("seeked", onSeeked);

    const tick = (timestamp: number) => {
      if (disposed) return;

      const deltaMs = Math.max(
        1,
        timestamp - lastTimestamp
      );

      const deltaY = window.scrollY - lastScrollY;

      const rawSpeed = clamp(
        (Math.abs(deltaY) / deltaMs) / 32,
        0,
        99
      );

      smoothSpeed +=
        (rawSpeed - smoothSpeed) * 0.15;

      lastScrollY = window.scrollY;
      lastTimestamp = timestamp;

      if (autoIntroActive && video.readyState >= 1) {
        if (autoIntroStart === null) {
          autoIntroStart = timestamp;
        }

        const elapsed = timestamp - autoIntroStart;

        const progress = clamp(
          elapsed / AUTO_INTRO_DURATION
        );

        // Smooth acceleration and deceleration.
        const easedProgress =
          progress * progress * (3 - 2 * progress);

        const trackTop =
          track.getBoundingClientRect().top +
          window.scrollY;

        const totalScrollDistance =
          Math.max(0, track.offsetHeight - viewportHeight);

        window.scrollTo({
          top:
            trackTop +
            easedProgress * totalScrollDistance,
          behavior: "instant",
        });

        if (progress >= 1) {
          autoIntroActive = false;
        }
      }

      const scroll = getTrackScroll();

      const clipProgress = clamp(
        scroll / (CLIP_VIEWPORTS * viewportHeight)
      );

      const stripProgress = clamp(
        (scroll -
          CLIP_VIEWPORTS * viewportHeight) /
        (stripViewports * viewportHeight)
      );

      targetTime =
        clipProgress *
        Math.max(
          0,
          (video.duration || CLIP_DURATION) -
          1 / 48
        );

      currentTime +=
        (targetTime - currentTime) * 0.2;

      if (
        video.readyState >= 1 &&
        !video.seeking &&
        !pendingSeek &&
        Math.abs(video.currentTime - currentTime) >
        1 / 60
      ) {
        try {
          pendingSeek = true;
          video.currentTime = currentTime;
        } catch {
          pendingSeek = false;
        }
      }

      const stripX =
        viewportWidth -
        stripProgress *
        (stripWidth + viewportWidth * 0.45);

      const lettersX =
        viewportWidth -
        stripProgress *
        (lettersWidth + viewportWidth);

      strip.style.transform =
        `translate3d(${stripX}px, 0, 0)`;

      letters.style.transform =
        `translate3d(${lettersX}px, 0, 0)`;

      scene.style.setProperty(
        "--ph",
        clipProgress >= 0.94 ? "1" : "0"
      );

      scene.style.setProperty(
        "--speed",
        `"${String(
          Math.round(smoothSpeed)
        ).padStart(2, "0")} KM/H"`
      );

      const cards = strip.querySelectorAll<HTMLElement>(
        ".freight-feature"
      );

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();

        const sweep =
          clamp(
            (0.98 -
              rect.left / viewportWidth) /
            0.3,
            -0.4,
            1.6
          ) * 100;

        card.style.setProperty(
          "--sweep",
          `${sweep}%`
        );
      });

      frame = requestAnimationFrame(tick);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(strip);
    observer.observe(letters);

    window.addEventListener("resize", resize);

    resize();
    frame = requestAnimationFrame(tick);

    return () => {
      disposed = true;

      cancelAnimationFrame(frame);
      observer.disconnect();

      window.removeEventListener("resize", resize);

      window.removeEventListener(
        "wheel",
        stopAutoIntro
      );

      window.removeEventListener(
        "touchstart",
        stopAutoIntro
      );

      window.removeEventListener(
        "pointerdown",
        stopAutoIntro
      );

      window.removeEventListener(
        "keydown",
        stopOnKey
      );

      video.removeEventListener(
        "seeked",
        onSeeked
      );
    };
  }, [reducedMotion]);

  return (
    <section
      ref={trackRef}
      className={[
        "freight-track",
        reducedMotion ? "freight-reduced" : "",
      ].join(" ")}
    >
      <nav
        className="freight-nav"
        aria-label="Main navigation"
      >
        <a href="/" className="freight-brand">
          EM
        </a>

        <div className="freight-nav-links">
          <a href="#marketplace">→ Marketplace</a>
          <a
            className="freight-follow"
            href="#how-it-works"
          >
            How it works
          </a>
          <a
            className="freight-nav-pill"
            href="/register"
          >
            Get Started
          </a>
          <a href="/login">
            Sign In
          </a>
        </div>
      </nav>

      <div
        ref={sceneRef}
        className="freight-scene"
      >

        <video
          ref={videoRef}
          className="freight-video"
          src="/media/freight-hero-1080.mp4"
          muted
          playsInline
          preload="auto"
          poster="/media/freight-poster.jpg"
        />


        {/* {mediaError && (
          <div className="freight-media-fallback">
            Freight scene unavailable.
            <span>
              Check the video files in public/media.
            </span>
          </div>
        )} */}

        <div
          ref={lettersRef}
          className="freight-giant-letters"
          aria-hidden="true"
        >
          EMPTY MILES
        </div>

        <div
          className="freight-speed"
          aria-label="Illustrative scroll-speed indicator"
        />

        <div className="freight-band">
          <div
            ref={stripRef}
            className="freight-strip"
            id="marketplace"
          >
            <div className="freight-lead">
              <h1>
                EVERY EMPTY MILE.
                <br />
                A NEW OPPORTUNITY.
                <br />
                <span>ONE SMART MARKETPLACE.</span>
              </h1>

              <div className="freight-lead-copy">
                <p>
                  Match freight with available truck
                  capacity along existing journeys.
                  Less wasted space, more useful trips.
                </p>

                <p>
                  From Mumbai to Pune and beyond,
                  connect shippers and carriers
                  through smarter route compatibility.
                </p>
              </div>
            </div>

            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  className="freight-feature"
                  key={feature.title}
                >
                  <Icon
                    size={38}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />

                  <h2>
                    {feature.title
                      .split("\n")
                      .map((line, index) => (
                        <span key={index}>
                          {line}
                          <br />
                        </span>
                      ))}
                  </h2>

                  <p>{feature.body}</p>
                </article>
              );
            })}
          </div>

          <a
            href="#how-it-works"
            className="freight-bottom-pill"
          >
            EXPLORE THE PLATFORM
            <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
