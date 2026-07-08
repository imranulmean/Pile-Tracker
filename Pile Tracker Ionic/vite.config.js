import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({

  // server: {
  //   host: '172.23.1.28',
  //   port: 5173,
  // },  

  plugins: [
    react()   
  ] 
});