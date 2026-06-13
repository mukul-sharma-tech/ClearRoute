
import {Route , BrowserRouter as Router, Routes} from 'react-router-dom';
import LandingPage from './pages/landing';
import './App.css';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <div className='App'>


  <Router>

    <AuthProvider>
    <Routes>
    <Route path = '/' element = {<LandingPage/>}/>
    <Route path = '/auth' element = {<Authentication/>}/>
    <Route path = '/home' element = {<HomeComponent/>}/>
    <Route path = '/admin' element = {<AdminDashboard/>}/>

    <Route path = '/:url' element={<VideoMeetComponent/>}/>
    
    </Routes>
    </AuthProvider>
  </Router>


    </div>
  );
}

export default App;
