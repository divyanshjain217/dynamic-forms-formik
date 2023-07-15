import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import NewForm from "./components/Form/Form";
function App() {
  const [count, setCount] = useState(0)

  return <NewForm />;
}

export default App
