import {BrowserRouter, Route, Routes} from 'react-router-dom';
import PostsContainer from './components/PostsContainer';
import {CollapsibleHeader} from "./components/CollapsibleHeader";
import {NavBar} from "./components/NavBar.tsx";

function App() {

    return (<BrowserRouter>
        <div style={{
            minHeight:  '100vh',
            background: 'linear-gradient(to bottom right, #a855f7, #4f46e5)'
        }}>
            <div style={{
                maxWidth: '72rem',
                margin:   '0 auto',
                padding:  '0 1rem'
            }}>
                <CollapsibleHeader>
                    <NavBar></NavBar>
                </CollapsibleHeader>
                <Routes>
                    <Route path="/" element={<PostsContainer/>}/>
                    <Route path="/source/:sourceType" element={<PostsContainer/>}/>

                    <Route path="/source/:sourceType" element={<PostsContainer/>}/>
                </Routes>
            </div>
        </div>
    </BrowserRouter>);
}

export default App;