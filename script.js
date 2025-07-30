// API Configuration
const API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces';

// Global Variables
let currentPage = 1;
let currentCategory = 'popular';
let isLoading = false;
let searchQuery = '';
let searchTimeout;

// DOM Elements
const moviesGrid = document.getElementById('moviesGrid');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loading = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const navBtns = document.querySelectorAll('.nav-btn');
const movieModal = document.getElementById('movieModal');
const closeModal = document.getElementById('closeModal');
const sectionTitle = document.querySelector('.section-title');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadMovies();
    setupEventListeners();
    createDynamicBackground();
});

// Create Dynamic Background Particles
function createDynamicBackground() {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particle-container';
    document.body.appendChild(particleContainer);

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (Math.random() * 20 + 10) + 's';
        particleContainer.appendChild(particle);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation buttons
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            navBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            currentPage = 1;
            searchQuery = '';
            searchInput.value = '';
            clearMoviesGrid();
            updateSectionTitle();
            loadMovies();
        });
    });

    // Live Search functionality
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length > 2) {
            searchTimeout = setTimeout(() => {
                performLiveSearch(query);
            }, 300); // 300ms delay for live search
        } else if (query.length === 0) {
            // Reset to current category when search is cleared
            searchQuery = '';
            currentPage = 1;
            clearMoviesGrid();
            updateSectionTitle();
            loadMovies();
        }
    });

    // Search button
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            performLiveSearch(query);
        }
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                performLiveSearch(query);
            }
        }
    });

    // Load more button
    loadMoreBtn.addEventListener('click', loadMoreMovies);

    // Modal close
    closeModal.addEventListener('click', closeMovieModal);
    movieModal.addEventListener('click', (e) => {
        if (e.target === movieModal) {
            closeMovieModal();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMovieModal();
        }
    });

    // Add scroll animations
    window.addEventListener('scroll', handleScrollAnimations);
}

// Live Search Function
function performLiveSearch(query) {
    searchQuery = query;
    currentPage = 1;
    clearMoviesGrid();
    updateSectionTitle(`"${query}" için arama sonuçları`);
    
    // Remove active class from nav buttons
    navBtns.forEach(btn => btn.classList.remove('active'));
    
    // Add search indicator
    searchInput.classList.add('searching');
    setTimeout(() => searchInput.classList.remove('searching'), 1000);
    
    loadMovies();
}

// Scroll Animations
function handleScrollAnimations() {
    const cards = document.querySelectorAll('.movie-card');
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            card.classList.add('animate-in');
        }
    });
}

// API Functions
async function fetchMovies(category = 'popular', page = 1, search = '') {
    try {
        let url;
        if (search) {
            url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(search)}&page=${page}&language=tr-TR`;
        } else {
            url = `${BASE_URL}/movie/${category}?api_key=${API_KEY}&page=${page}&language=tr-TR`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching movies:', error);
        showError('Filmler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        return null;
    }
}

async function fetchMovieDetails(movieId) {
    try {
        const [movieResponse, creditsResponse, imagesResponse, videosResponse] = await Promise.all([
            fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=tr-TR`),
            fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`),
            fetch(`${BASE_URL}/movie/${movieId}/images?api_key=${API_KEY}`),
            fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=tr-TR`)
        ]);

        if (!movieResponse.ok || !creditsResponse.ok) {
            throw new Error('Failed to fetch movie details');
        }

        const movieData = await movieResponse.json();
        const creditsData = await creditsResponse.json();
        const imagesData = await imagesResponse.json();
        const videosData = await videosResponse.json();

        return {
            movie: movieData,
            credits: creditsData,
            images: imagesData,
            videos: videosData
        };
    } catch (error) {
        console.error('Error fetching movie details:', error);
        showError('Film detayları yüklenirken bir hata oluştu.');
        return null;
    }
}

// UI Functions
function createMovieCard(movie) {
    const movieCard = document.createElement('div');
    movieCard.className = 'movie-card';
    movieCard.addEventListener('click', () => openMovieModal(movie.id));

    const posterPath = movie.poster_path 
        ? `${IMAGE_BASE_URL}${movie.poster_path}` 
        : 'https://via.placeholder.com/500x750/333/fff?text=Poster+Yok';

    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'Bilinmiyor';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

    movieCard.innerHTML = `
        <div class="movie-poster">
            <img src="${posterPath}" alt="${movie.title}" loading="lazy">
            <div class="movie-rating">
                <i class="fas fa-star"></i> ${rating}
            </div>
        </div>
    `;

    // Add stagger animation delay
    const existingCards = document.querySelectorAll('.movie-card').length;
    movieCard.style.animationDelay = `${existingCards * 0.1}s`;

    return movieCard;
}

function displayMovies(movies) {
    if (!movies || movies.length === 0) {
        if (currentPage === 1) {
            showNoResults();
        }
        return;
    }

    movies.forEach((movie, index) => {
        const movieCard = createMovieCard(movie);
        movieCard.style.opacity = '0';
        movieCard.style.transform = 'translateY(50px) scale(0.8)';
        moviesGrid.appendChild(movieCard);
        
        // Staggered animation
        setTimeout(() => {
            movieCard.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            movieCard.style.opacity = '1';
            movieCard.style.transform = 'translateY(0) scale(1)';
        }, index * 100);
    });
}

async function loadMovies() {
    if (isLoading) return;

    isLoading = true;
    showLoading();

    try {
        const data = await fetchMovies(currentCategory, currentPage, searchQuery);
        
        if (data && data.results) {
            displayMovies(data.results);
            
            // Show/hide load more button
            if (currentPage >= data.total_pages || data.results.length === 0) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading movies:', error);
        showError('Filmler yüklenirken bir hata oluştu.');
    } finally {
        hideLoading();
        isLoading = false;
    }
}

function loadMoreMovies() {
    if (!isLoading) {
        currentPage++;
        loadMovies();
    }
}

function performSearch() {
    const query = searchInput.value.trim();
    if (query === '') {
        alert('Lütfen arama terimi girin!');
        return;
    }

    searchQuery = query;
    currentPage = 1;
    clearMoviesGrid();
    updateSectionTitle(`"${query}" için arama sonuçları`);
    
    // Remove active class from nav buttons
    navBtns.forEach(btn => btn.classList.remove('active'));
    
    loadMovies();
}

async function openMovieModal(movieId) {
    showLoading();
    
    try {
        const data = await fetchMovieDetails(movieId);
        
        if (data) {
            populateMovieModal(data.movie, data.credits, data.images, data.videos);
            movieModal.classList.add('show', 'black-and-white');
            document.body.style.overflow = 'hidden';
            
            // Add modal entrance animation
            const modalContent = document.querySelector('.modal-content');
            modalContent.style.transform = 'scale(0.7) rotateY(-15deg)';
            modalContent.style.opacity = '0';
            
            setTimeout(() => {
                modalContent.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                modalContent.style.transform = 'scale(1) rotateY(0deg)';
                modalContent.style.opacity = '1';
            }, 100);
        }
    } catch (error) {
        console.error('Error opening movie modal:', error);
        showError('Film detayları yüklenirken bir hata oluştu.');
    } finally {
        hideLoading();
    }
}

function populateMovieModal(movie, credits, images, videos) {
    const modalPoster = document.getElementById('modalPoster');
    const modalTitle = document.getElementById('modalTitle');
    const modalRating = document.getElementById('modalRating');
    const modalYear = document.getElementById('modalYear');
    const modalRuntime = document.getElementById('modalRuntime');
    const modalGenres = document.getElementById('modalGenres');
    const modalOverview = document.getElementById('modalOverview');
    const modalDirector = document.getElementById('modalDirector');
    const modalCast = document.getElementById('modalCast');
    const modalBudget = document.getElementById('modalBudget');
    const modalRevenue = document.getElementById('modalRevenue');

    // Basic movie info
    modalPoster.src = movie.poster_path 
        ? `${IMAGE_BASE_URL}${movie.poster_path}` 
        : 'https://via.placeholder.com/500x750/333/fff?text=Poster+Yok';
    modalPoster.alt = movie.title;
    modalTitle.textContent = movie.title;
    modalRating.textContent = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    modalYear.textContent = movie.release_date ? new Date(movie.release_date).getFullYear() : 'Bilinmiyor';
    modalRuntime.textContent = movie.runtime ? `${movie.runtime} dakika` : 'Bilinmiyor';
    modalOverview.textContent = movie.overview || 'Açıklama mevcut değil.';

    // Genres
    modalGenres.innerHTML = '';
    if (movie.genres && movie.genres.length > 0) {
        movie.genres.forEach(genre => {
            const genreTag = document.createElement('span');
            genreTag.className = 'genre-tag';
            genreTag.textContent = genre.name;
            modalGenres.appendChild(genreTag);
        });
    }

    // Director
    const director = credits.crew.find(person => person.job === 'Director');
    modalDirector.textContent = director ? director.name : 'Bilinmiyor';

    // Cast (first 5 actors)
    const mainCast = credits.cast.slice(0, 5).map(actor => actor.name).join(', ');
    modalCast.textContent = mainCast || 'Bilinmiyor';

    // Budget and Revenue
    modalBudget.textContent = movie.budget ? formatCurrency(movie.budget) : 'Bilinmiyor';
    modalRevenue.textContent = movie.revenue ? formatCurrency(movie.revenue) : 'Bilinmiyor';

    // Update action buttons with dynamic watch functionality
    updateActionButtons(movie);

    // Add cast photos section
    createCastPhotosSection(credits.cast);
    
    // Add movie images gallery
    createImageGallery(images);
    
    // Add trailer section
    createTrailerSection(videos);
    
    // Add additional movie stats
    createMovieStats(movie);
}

// Function to update action buttons with watch functionality
function updateActionButtons(movie) {
    const actionButtons = document.querySelector('.action-buttons');
    
    actionButtons.innerHTML = `
        <button class="btn-watch" onclick="watchMovie('${movie.title}', ${movie.release_date ? new Date(movie.release_date).getFullYear() : 'null'})">
            <i class="fas fa-play-circle"></i>
            <span class="btn-text">Film İzle</span>
            <div class="btn-shine"></div>
        </button>
        <button class="btn-trailer" onclick="playTrailer()">
            <i class="fas fa-video"></i>
            <span class="btn-text">Fragman İzle</span>
            <div class="btn-shine"></div>
        </button>
        <button class="btn-favorite" onclick="addToFavorites('${movie.id}')">
            <i class="fas fa-heart"></i>
            <span class="btn-text">Favorilere Ekle</span>
            <div class="btn-shine"></div>
        </button>
        <button class="btn-share" onclick="shareMovie('${movie.title}')">
            <i class="fas fa-share-alt"></i>
            <span class="btn-text">Paylaş</span>
            <div class="btn-shine"></div>
        </button>
    `;
}

// Function to watch movie - redirects to external site
function watchMovie(movieTitle, movieYear) {
    // Show loading animation
    showWatchLoading();
    
    // Create search query for the external site
    const searchQuery = encodeURIComponent(movieTitle + (movieYear ? ` ${movieYear}` : ''));
    const watchUrl = `https://www.fullhdfilmizlesene.so/arama/${searchQuery}`;
    
    // Add some dramatic effect before redirect
    setTimeout(() => {
        // Open in new tab for better user experience
        window.open(watchUrl, '_blank');
        hideWatchLoading();
        
        // Show success message
        showSuccessMessage(`"${movieTitle}" filmi yeni sekmede açıldı!`);
    }, 1500);
}

// Function to play trailer
function playTrailer() {
    const trailerSection = document.querySelector('.trailer-section');
    if (trailerSection) {
        trailerSection.scrollIntoView({ behavior: 'smooth' });
        // Add highlight effect
        trailerSection.style.animation = 'highlightPulse 2s ease-in-out';
        setTimeout(() => {
            trailerSection.style.animation = '';
        }, 2000);
    } else {
        showInfoMessage('Bu film için fragman bulunamadı.');
    }
}

// Function to add to favorites
function addToFavorites(movieId) {
    // Get existing favorites from localStorage
    let favorites = JSON.parse(localStorage.getItem('movieFavorites') || '[]');
    
    if (!favorites.includes(movieId)) {
        favorites.push(movieId);
        localStorage.setItem('movieFavorites', JSON.stringify(favorites));
        showSuccessMessage('Film favorilerinize eklendi!');
        
        // Update button style
        const favoriteBtn = document.querySelector('.btn-favorite');
        favoriteBtn.classList.add('favorited');
        favoriteBtn.innerHTML = `
            <i class="fas fa-heart"></i>
            <span class="btn-text">Favorilerde</span>
            <div class="btn-shine"></div>
        `;
    } else {
        showInfoMessage('Bu film zaten favorilerinizde!');
    }
}

// Function to share movie
function shareMovie(movieTitle) {
    if (navigator.share) {
        navigator.share({
            title: movieTitle,
            text: `${movieTitle} filmini izlemelisin!`,
            url: window.location.href
        });
    } else {
        // Fallback to clipboard
        const shareText = `${movieTitle} filmini izlemelisin! ${window.location.href}`;
        navigator.clipboard.writeText(shareText).then(() => {
            showSuccessMessage('Film linki panoya kopyalandı!');
        });
    }
}

// Show watch loading animation
function showWatchLoading() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'watch-loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="watch-loading-content">
            <div class="watch-spinner"></div>
            <h3>Film Hazırlanıyor...</h3>
            <p>En iyi izleme deneyimi için yönlendiriliyorsunuz</p>
            <div class="loading-progress">
                <div class="progress-bar"></div>
            </div>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

// Hide watch loading animation
function hideWatchLoading() {
    const loadingOverlay = document.querySelector('.watch-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.remove();
        }, 300);
    }
}

// Show success message
function showSuccessMessage(message) {
    showMessage(message, 'success');
}

// Show info message
function showInfoMessage(message) {
    showMessage(message, 'info');
}

// Generic message function
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-notification ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 'info-circle';
    
    messageDiv.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Animate in
    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => {
            messageDiv.remove();
        }, 300);
    }, 3000);
}

function createCastPhotosSection(cast) {
    // Remove existing cast section
    const existingCastSection = document.querySelector('.cast-photos-section');
    if (existingCastSection) {
        existingCastSection.remove();
    }

    const castSection = document.createElement('div');
    castSection.className = 'cast-photos-section';
    castSection.innerHTML = '<h3><i class="fas fa-users"></i> Oyuncu Kadrosu</h3>';

    const castContainer = document.createElement('div');
    castContainer.className = 'cast-container';

    // Show first 10 cast members with photos
    cast.forEach((actor, index) => {
        if (actor.profile_path) {
            const actorCard = document.createElement('div');
            actorCard.className = 'actor-card';
            actorCard.style.animationDelay = `${index * 0.1}s`;
            
            actorCard.innerHTML = `
                <div class="actor-photo">
                    <img src="${IMAGE_BASE_URL}${actor.profile_path}" alt="${actor.name}" loading="lazy">
                    <div class="actor-overlay">
                        <div class="actor-info">
                            <h4>${actor.name}</h4>
                            <p>${actor.character || 'Rol bilinmiyor'}</p>
                        </div>
                    </div>
                </div>
            `;
            
            castContainer.appendChild(actorCard);
        }
    });

    castSection.appendChild(castContainer);
    document.querySelector('.modal-body').appendChild(castSection);
}

function createImageGallery(images) {
    // Remove existing gallery
    const existingGallery = document.querySelector('.image-gallery-section');
    if (existingGallery) {
        existingGallery.remove();
    }

    if (images.backdrops && images.backdrops.length > 0) {
        const gallerySection = document.createElement('div');
        gallerySection.className = 'image-gallery-section';
        gallerySection.innerHTML = '<h3><i class="fas fa-images"></i> Film Görselleri</h3>';

        const galleryContainer = document.createElement('div');
        galleryContainer.className = 'image-gallery';

        // Show first 6 backdrop images
        images.backdrops.slice(0, 6).forEach((image, index) => {
            const imageCard = document.createElement('div');
            imageCard.className = 'gallery-image';
            imageCard.style.animationDelay = `${index * 0.1}s`;
            
            imageCard.innerHTML = `
                <img src="${IMAGE_BASE_URL}${image.file_path}" alt="Film görseli" loading="lazy">
                <div class="image-overlay">
                    <i class="fas fa-expand"></i>
                </div>
            `;
            
            galleryContainer.appendChild(imageCard);
        });

        gallerySection.appendChild(galleryContainer);
        document.querySelector('.modal-body').appendChild(gallerySection);
    }
}

function createTrailerSection(videos) {
    // Remove existing trailer section
    const existingTrailer = document.querySelector('.trailer-section');
    if (existingTrailer) {
        existingTrailer.remove();
    }

    const trailer = videos.results.find(video => 
        video.type === 'Trailer' && video.site === 'YouTube'
    );

    if (trailer) {
        const trailerSection = document.createElement('div');
        trailerSection.className = 'trailer-section';
        trailerSection.innerHTML = `
            <h3><i class="fas fa-play-circle"></i> Film Fragmanı</h3>
            <div class="trailer-container">
                <iframe 
                    src="https://www.youtube.com/embed/${trailer.key}" 
                    frameborder="0" 
                    allowfullscreen>
                </iframe>
            </div>
        `;
        
        document.querySelector('.modal-body').appendChild(trailerSection);
    }
}

function createMovieStats(movie) {
    // Remove existing stats
    const existingStats = document.querySelector('.movie-extended-stats');
    if (existingStats) {
        existingStats.remove();
    }

    const statsSection = document.createElement('div');
    statsSection.className = 'movie-extended-stats';
    
    statsSection.innerHTML = `
        <h3><i class="fas fa-chart-bar"></i> Film İstatistikleri</h3>
        <div class="stats-grid">
            <div class="stat-item">
                <i class="fas fa-star"></i>
                <span class="stat-label">Ortalama Puan</span>
                <span class="stat-value">${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}/10</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-users"></i>
                <span class="stat-label">Oy Sayısı</span>
                <span class="stat-value">${movie.vote_count || 0}</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-fire"></i>
                <span class="stat-label">Popülarite</span>
                <span class="stat-value">${Math.round(movie.popularity || 0)}</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-globe"></i>
                <span class="stat-label">Orijinal Dil</span>
                <span class="stat-value">${movie.original_language ? movie.original_language.toUpperCase() : 'N/A'}</span>
            </div>
        </div>
    `;
    
    document.querySelector('.modal-body').appendChild(statsSection);
}

function closeMovieModal() {
    movieModal.classList.remove('show', 'black-and-white');
    document.body.style.overflow = 'auto';
}

function clearMoviesGrid() {
    moviesGrid.innerHTML = '';
}

function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #e50914;
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        z-index: 3000;
        box-shadow: 0 10px 25px rgba(229, 9, 20, 0.3);
        animation: slideDown 0.3s ease;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showNoResults() {
    moviesGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: rgba(255, 255, 255, 0.6);">
            <i class="fas fa-search" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <h3>Sonuç bulunamadı</h3>
            <p>Aradığınız kriterlere uygun film bulunamadı.</p>
        </div>
    `;
    loadMoreBtn.style.display = 'none';
}

function updateSectionTitle(title) {
    const titles = {
        'popular': 'Popüler Filmler',
        'top_rated': 'En İyi Filmler',
        'upcoming': 'Yakında Vizyonda',
        'now_playing': 'Şu Anda Vizyonda'
    };
    
    sectionTitle.textContent = title || titles[currentCategory] || 'Filmler';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Add CSS animation for new cards
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);
