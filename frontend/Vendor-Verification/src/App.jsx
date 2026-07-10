import './App.css'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './Pages/Login';
import Navbar from './Components/Navbar';
import {Toaster} from 'react-hot-toast';

function App() {

  return (
    <>
      <Router>
        <Navbar></Navbar>
        <Toaster></Toaster>
        <Routes>
          <Route path="/login" element = {<Login/>} />
        </Routes>
      </Router>
    </>
  )
}

export default App
