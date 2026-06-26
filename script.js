// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        // Set initial ARIA state
        hamburger.setAttribute('aria-expanded', 'false');
        
        const toggleMobileNav = function() {
            const isActive = hamburger.classList.contains('active');
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', !isActive ? 'true' : 'false');
            
            // Focus management: move focus to first nav link when opening
            if (!isActive) {
                const firstLink = navMenu.querySelector('.nav-link');
                if (firstLink) {
                    // Use requestAnimationFrame to ensure CSS transitions complete
                    requestAnimationFrame(() => {
                        firstLink.focus();
                    });
                }
            }
        };
        
        // Click event
        hamburger.addEventListener('click', function() {
            toggleMobileNav();
        });
        
        // Keyboard support (Enter and Space keys)
        hamburger.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ' || event.code === 'Space') {
                event.preventDefault();
                toggleMobileNav();
            }
        });
    }
    
    // Close mobile menu when a nav link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            if (hamburger) {
                hamburger.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
            }
            if (navMenu) {
                navMenu.classList.remove('active');
            }
        });
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (hamburger && navMenu) {
            const isClickInsideNav = navMenu.contains(event.target);
            const isClickOnHamburger = hamburger.contains(event.target);
            
            if (!isClickInsideNav && !isClickOnHamburger && navMenu.classList.contains('active')) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
            }
        }
    });
    
    // Smooth scrolling for anchor links (if any are added later)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Skip if it's just "#" (placeholder)
            if (href === '#') {
                e.preventDefault();
                return;
            }

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ============================================
    // PROJECT FILTERING SYSTEM
    // ============================================
    initProjectFilters();

    // ============================================
    // SCROLL REVEAL (progressive enhancement)
    // ============================================
    initScrollReveal();

    // ============================================
    // CARD SPOTLIGHT — a soft light that follows the cursor across cards,
    // so each surface catches light individually instead of looking printed.
    // ============================================
    initCardSpotlight();
});

/**
 * Cursor-follow spotlight on card surfaces. Uses a single delegated
 * pointermove listener, rAF-throttled, and only writes CSS custom
 * properties (--mx/--my) on the card currently under the cursor.
 */
function initCardSpotlight() {
    const selector = '.card, .project-card, .service-card, .detail-card, .skill-item, ' +
        '.category-card, .contact-info-card, .contact-form-card, .case-study-card, .about-card';
    let pending = null, frame = null;

    function apply() {
        frame = null;
        if (!pending) return;
        const { card, x, y } = pending;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((x - rect.left) / rect.width * 100) + '%');
        card.style.setProperty('--my', ((y - rect.top) / rect.height * 100) + '%');
    }

    document.addEventListener('pointermove', function(e) {
        const card = e.target.closest(selector);
        if (!card) return;
        pending = { card: card, x: e.clientX, y: e.clientY };
        if (!frame) frame = requestAnimationFrame(apply);
    }, { passive: true });
}

/**
 * Reveal elements with the `.reveal` class as they scroll into view.
 * Only activates when motion is allowed and IntersectionObserver exists;
 * otherwise content stays fully visible (the hidden state is scoped to
 * the `.js-reveal` class we add here).
 */
function initScrollReveal() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = document.querySelectorAll('.reveal');
    if (prefersReduced || !('IntersectionObserver' in window) || !targets.length) return;

    document.body.classList.add('js-reveal');

    const observer = new IntersectionObserver(function(entries, obs) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    targets.forEach(function(el) { observer.observe(el); });
}

/**
 * Initialize project filtering system
 * Populates filter dropdown and handles filtering
 */
function initProjectFilters() {
    const filterSelect = document.getElementById('tech-filter');
    if (!filterSelect) return;

    // Collect all unique technologies from project cards
    const technologies = collectTechnologies();

    // Populate the filter dropdown
    populateFilterDropdown(filterSelect, technologies);

    // Add filter change event
    filterSelect.addEventListener('change', function() {
        filterProjects(this.value);
    });
}

/**
 * Collect all unique technologies from project cards
 * @returns {string[]} Sorted array of unique technologies
 */
function collectTechnologies() {
    const techSet = new Set();

    document.querySelectorAll('.project-card').forEach(card => {
        const techAttr = card.getAttribute('data-technologies');
        if (techAttr && techAttr.trim()) {
            techAttr.split(',').forEach(tech => {
                const trimmed = tech.trim();
                if (trimmed) {
                    techSet.add(trimmed);
                }
            });
        }
    });

    // Convert to array and sort alphabetically
    return Array.from(techSet).sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
    );
}

/**
 * Populate the filter dropdown with technology options
 * @param {HTMLSelectElement} select 
 * @param {string[]} technologies 
 */
function populateFilterDropdown(select, technologies) {
    technologies.forEach(tech => {
        const option = document.createElement('option');
        option.value = tech;
        option.textContent = tech;
        select.appendChild(option);
    });
}

/**
 * Filter projects by selected technology
 * @param {string} selectedTech - Technology to filter by, or 'all'
 */
function filterProjects(selectedTech) {
    const projectCards = document.querySelectorAll('.project-card');
    const projectSections = document.querySelectorAll('.project-section');

    projectCards.forEach(card => {
        const techAttr = card.getAttribute('data-technologies') || '';
        const technologies = techAttr.split(',').map(t => t.trim());

        if (selectedTech === 'all' || technologies.includes(selectedTech)) {
            card.style.display = '';
            card.classList.remove('filtered-out');
        } else {
            card.style.display = 'none';
            card.classList.add('filtered-out');
        }
    });

    // Hide sections that have no visible cards
    projectSections.forEach(section => {
        const visibleCards = section.querySelectorAll('.project-card:not(.filtered-out)');
        if (visibleCards.length === 0) {
            section.style.display = 'none';
        } else {
            section.style.display = '';
        }
    });
}

