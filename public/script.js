// public/script.js - O Frontend (sem segredos)

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const loginScreen = document.getElementById('login-screen');
    const dashboardWrapper = document.getElementById('dashboard-wrapper');
    const submitButton = document.getElementById('submit-code');
    const codeInput = document.getElementById('access-code');
    const errorMessage = document.getElementById('error-message');

    // Variável para guardar o código do usuário após o login bem-sucedido
    let currentUserCode = null;

    // --- LÓGICA DE FAVORITOS (Executada inteiramente no navegador) ---
    function getFavorites() {
        const favorites = localStorage.getItem('dashboardFavorites');
        return favorites ? JSON.parse(favorites) : {};
    }

    function saveFavorites(favorites) {
        localStorage.setItem('dashboardFavorites', JSON.stringify(favorites));
    }

    function setupFavorites(userCode) {
        const favoriteLinks = document.querySelectorAll('.dashboard-list a');
        
        const updateUserFavoritesUI = () => {
            const currentFavorites = getFavorites();
            const userFavoriteData = currentFavorites[userCode];
            
            favoriteLinks.forEach(link => {
                const star = link.querySelector('.favorite-star');
                if (star) {
                    const dashboardId = link.getAttribute('data-target');
                    if (userFavoriteData && dashboardId === userFavoriteData.id) {
                        star.classList.add('active');
                    } else {
                        star.classList.remove('active');
                    }
                }
            });
        };

        favoriteLinks.forEach(link => {
            const star = link.querySelector('.favorite-star');
            if (star) {
                star.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const favorites = getFavorites();
                    const dashboardId = link.getAttribute('data-target');
                    const isAlreadyFavorite = star.classList.contains('active');

                    if (isAlreadyFavorite) {
                        delete favorites[userCode];
                    } else {
                        favorites[userCode] = {
                            id: dashboardId,
                            // O href real não é mais necessário aqui, o redirecionamento cuidará disso
                        };
                    }

                    saveFavorites(favorites);
                    updateUserFavoritesUI();
                });
            }
        });

        updateUserFavoritesUI();
    }

    // --- LÓGICA DE NAVEGAÇÃO SEGURA DOS DASHBOARDS ---
    function setupDashboardRedirects() {
        const dashboardLinks = document.querySelectorAll('.dashboard-link');

        dashboardLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault(); // Impede a navegação padrão para '#'

                const dashboardId = link.getAttribute('data-target');
                
                if (currentUserCode && dashboardId) {
                    const encodedCode = btoa(currentUserCode);
                    
                    // Constrói a URL segura que aponta para o nosso backend
                    const redirectUrl = `/open-dashboard?id=${dashboardId}&pk=${encodedCode}`;
                    
                    const openInNewTab = link.getAttribute('data-original-target') === '_blank';
                    
                    if (openInNewTab) {
                        window.open(redirectUrl, '_blank');
                    } else {
                        window.location.href = redirectUrl;
                    }
                } else {
                    alert("Erro de autenticação. Por favor, faça o login novamente.");
                }
            });
        });
    }

    // --- FUNÇÃO PRINCIPAL PARA EXIBIR O DASHBOARD ---
    function showDashboard(code, permissions, userData) {
        currentUserCode = code;

        // Personaliza a saudação de boas-vindas
        const welcomeGreetingEl = document.getElementById('welcome-greeting');
        if (userData && userData.user && welcomeGreetingEl) {
            const fullName = userData.user;
            let firstName = fullName.split(' ')[0];
            firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
            welcomeGreetingEl.textContent = `Olá, ${firstName}!`;
        }

        loginScreen.style.display = 'none';
        dashboardWrapper.style.display = 'flex';
        
        // Esconde todos os links e grupos de menu para começar
        document.querySelectorAll('.dashboard-list a').forEach(link => link.style.display = 'none');
        document.querySelectorAll('.menu-group').forEach(group => group.style.display = 'none');

        // Exibe apenas os links e grupos permitidos
        if (permissions.includes('all')) {
            document.querySelectorAll('.menu-group').forEach(group => group.style.display = 'block');
            document.querySelectorAll('.dashboard-list a').forEach(link => link.style.display = 'flex');
        } else {
            const visibleGroups = new Set();
            permissions.forEach(permissionId => {
                const linkToShow = document.querySelector(`.dashboard-list a[data-target="${permissionId}"]`);
                if (linkToShow) {
                    linkToShow.style.display = 'flex';
                    const parentGroup = linkToShow.closest('.menu-group');
                    if (parentGroup) visibleGroups.add(parentGroup);
                }
            });
            visibleGroups.forEach(group => group.style.display = 'block');
        }

        // Configura todas as interatividades do dashboard
        setupDashboardNavigation();
        setupFavorites(code);
        setupDashboardRedirects();
    }
    
    // --- LÓGICA DE LOGIN ---
    async function attemptLogin() {
        const code = codeInput.value.trim();
        if (!code) return;

        errorMessage.style.display = 'none';

        try {
            // A chamada agora é para a nossa própria API no backend
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginCode: code })
            });

            const result = await response.json();

            if (!response.ok) {
                // Se a resposta não for 2xx, exibe a mensagem de erro do servidor
                throw new Error(result.message || 'Login inválido!');
            }

            const { permissions, userData } = result;

            // Lógica de redirecionamento para favorito
            const favorites = getFavorites();
            const favoriteData = favorites[code];

            if (favoriteData && favoriteData.id) {
                // Se existe um favorito, simula um clique nele
                const favoriteLink = document.querySelector(`.dashboard-link[data-target="${favoriteData.id}"]`);
                if (favoriteLink) {
                    currentUserCode = code; // Define o usuário antes de redirecionar
                    favoriteLink.click();
                } else {
                    // Caso o link favorito não exista mais, mostra o dashboard normal
                    showDashboard(code, permissions, userData);
                }
            } else {
                // Se não houver favorito, apenas mostra a central de dashboards
                showDashboard(code, permissions, userData);
            }

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
            codeInput.value = '';
        }
    }
    
    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    function initialize() {
        loginScreen.style.display = 'flex';
        submitButton.addEventListener('click', attemptLogin);
        codeInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                attemptLogin();
            }
        });
    }

    initialize();
});


// --- FUNÇÕES DE UI (não precisam estar dentro do DOMContentLoaded) ---
function setupDashboardNavigation() {
    const listLinks = document.querySelectorAll('.dashboard-list a');
    const previewPanes = document.querySelectorAll('.preview-content');
    const welcomePane = document.getElementById('welcome-pane');

    // Mostra o painel de boas-vindas por padrão
    if (welcomePane) {
        previewPanes.forEach(p => p.classList.remove('active'));
        welcomePane.classList.add('active');
    }

    listLinks.forEach(link => {
        // Efeito de preview ao passar o mouse
        link.addEventListener('mouseenter', () => {
            // Não remove a classe 'active' do link clicado, apenas de outros
            listLinks.forEach(l => l.classList.remove('active'));
            previewPanes.forEach(p => p.classList.remove('active'));
            
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            const activePreviewPane = document.getElementById(targetId);
            
            if (activePreviewPane) {
                activePreviewPane.classList.add('active');
            } else {
                welcomePane.classList.add('active');
            }
        });
    });

    // Lógica de acordeão para os grupos de menu
    const menuToggles = document.querySelectorAll('.menu-group-toggle');
    menuToggles.forEach(clickedToggle => {
        clickedToggle.addEventListener('click', () => {
            const currentGroup = clickedToggle.parentElement;
            const isAlreadyExpanded = currentGroup.classList.contains('expanded');
            
            // Fecha todos os grupos antes de abrir o clicado (opcional)
            document.querySelectorAll('.menu-group').forEach(group => group.classList.remove('expanded'));

            if (!isAlreadyExpanded) {
                currentGroup.classList.add('expanded');
            }
        });
    });
}