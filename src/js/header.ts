// @ts-nocheck
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// ============================================
// CONFIGURATION - ADJUST THESE VALUES
// ============================================
const CONFIG = {
    // How many pixels to scroll before animation completes
    scrollDistance: 150,

    // Smoothing factor (0 = instant, 0.5 = slight lag, 1+ = more lag)
    // Higher values reduce jitter but feel less responsive
    scrubSmoothing: 0,

    // Container padding when collapsed (use fixed px to avoid font-size scaling)
    collapsedPaddingY: "6px",

    // Container height when collapsed (CSS value, e.g. "50px" or "auto")
    collapsedHeight: "44px",

    // Logo scale when collapsed (1 = 100%, 0.65 = 65%)
    logoScale: 0.6,

    // Nav horizontal shift when collapsed (negative = left)
    navX: -47,

    // Nav vertical shift when collapsed (negative = up)
    navY: -24,

    // Login region vertical shift when collapsed (negative = up)
    loginY: 16,

    // Shadow when scrolled
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
};
// ============================================

gsap.registerPlugin(ScrollTrigger);

((Drupal) => {
    Drupal.behaviors.sacdaHeader = {
        attach: (context) => {
            if (context !== document) return;
            // console.log(context)

            // console.log("Sacda: Initializing Header Animation...");

            const header = document.getElementById("sacda-header");
            const headerContainer = document.getElementById(
                "sacda-header-container",
            );
            const headerLogo = document.getElementById("sacda-header-logo");
            const headerNav = document.getElementById("sacda-header-nav");

            if (!header || !headerContainer) {
                console.warn("Sacda: Header elements not found", {
                    header,
                    headerContainer,
                });
                return;
            }

            // Get elements for collapsed state
            const menuScrollable = document.getElementById(
                "sacda-menu-scrollable",
            );
            const menuWrapper = document.getElementById(
                "sacda-menu-scrollable-wrapper",
            );
            const loginRegion = document.getElementById("sacda-login-region");

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: "body",
                    start: "top top",
                    end: `+=${CONFIG.scrollDistance}`,
                    scrub: true,
                    fastScrollEnd: true,
                    preventOverlaps: true,
                    // markers: true, // Uncomment for debug markers
                    // No --header-height update here: the viewers size off it,
                    // and resizing them on every scroll frame made
                    // OpenSeadragon redraw the whole image each frame.
                    // media-height.ts sets it on load and resize.
                },
            });

            // console.log("Sacda: GSAP Timeline created");

            // Shrink container padding and height
            tl.to(
                headerContainer,
                {
                    paddingTop: CONFIG.collapsedPaddingY,
                    paddingBottom: CONFIG.collapsedPaddingY,
                    height: CONFIG.collapsedHeight,
                    ease: "none",
                },
                0,
            );

            // Scale down logo
            if (headerLogo) {
                tl.to(
                    headerLogo,
                    {
                        scale: CONFIG.logoScale,
                        ease: "none",
                    },
                    0,
                );
            }

            // Shift nav left and up
            if (headerNav) {
                tl.to(
                    headerNav,
                    {
                        x: CONFIG.navX,
                        y: CONFIG.navY,
                        ease: "none",
                    },
                    0,
                );
            }

            // Scroll up the search/menu-top naturally (login region stays in place)

            if (menuScrollable) {
                tl.to(
                    menuScrollable,
                    {
                        yPercent: -100, // Scroll up by 100% of its own height
                        opacity: 0,
                        ease: "none",
                    },
                    0,
                );
            }

            // Collapse the wrapper so it takes no space
            if (menuWrapper) {
                tl.to(
                    menuWrapper,
                    {
                        height: 0,
                        ease: "none",
                    },
                    0,
                );
            }

            // Move login region up
            if (loginRegion) {
                tl.to(
                    loginRegion,
                    {
                        y: CONFIG.loginY,
                        ease: "none",
                    },
                    0,
                );
            }

            // Add shadow when scrolled
            tl.to(
                header,
                {
                    boxShadow: CONFIG.boxShadow,
                    ease: "none",
                },
                0,
            );

            // // Start collapsed on islandora-object pages when at top
            // const isIslandoraObject =
            //     document.querySelector(".node--type-islandora-object") !== null;
            // const isAtTop = window.scrollY === 0 || window.pageYOffset === 0;

            // if (isIslandoraObject && isAtTop) {
            //     // Immediately set to collapsed state without animation
            //     requestAnimationFrame(() => {
            //         tl.progress(1);
            //     });
            // }
        },
    };
})(Drupal);
