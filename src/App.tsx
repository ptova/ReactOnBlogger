import PostsContainer from './components/PostsContainer';

// ===== STYLE CONSTANTS =====

// Root container (full page background)
const appContainerStyles = ['min-h-screen', 'bg-gradient-to-br', 'from-purple-500', 'to-indigo-600'].join(' ');

// Inner wrapper
const wrapperStyles = ['max-w-6xl', 'mx-auto', 'px-4', 'sm:px-5', 'py-5', 'sm:py-6'].join(' ');

// Header styles
const headerStyles = ['text-center', 'text-white', 'py-8', 'sm:py-10', 'mb-6', 'sm:mb-10'].join(' ');

// Title styles
const headerTitleStyles = ['text-3xl', 'sm:text-4xl', 'md:text-5xl', 'font-bold', 'mb-2', 'sm:mb-3', 'drop-shadow-lg'].join(' ');

function App() {
    return (
        <div className={appContainerStyles}>
            <div className={wrapperStyles}>
                <header className={headerStyles}>
                    <h1 className={headerTitleStyles}>
                        REACT On Blogger
                    </h1>
                </header>

                <PostsContainer />
            </div>
        </div>
    );
}

export default App;