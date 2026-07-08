import { createRoot } from 'react-dom/client'
import '@ionic/react/css/core.css';

// Optional Ionic CSS
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

// Optional utility CSS
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';


import './index.css'
import App from './App.jsx'


createRoot(document.getElementById('root')).render(
    <App />
)
