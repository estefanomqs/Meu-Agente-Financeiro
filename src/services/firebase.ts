import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Pega as configurações do arquivo .env.local
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços para o resto do app usar
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- FUNÇÃO DO ESPIÃO DE APRENDIZADO (SMARTBAR) ---
export const logSmartBarEvent = async (
  userId: string,
  rawInput: string,
  aiPrediction: any,
  finalTransaction: any
) => {
  try {
    // Calcula se houve correção manual (Delta)
    const wasCorrected =
      aiPrediction.category !== finalTransaction.category ||
      aiPrediction.amount !== finalTransaction.amount ||
      aiPrediction.date !== finalTransaction.date;

    await addDoc(collection(db, 'smartbar_analytics'), {
      userId,
      timestamp: new Date().toISOString(),
      rawInput,
      prediction: {
        category: aiPrediction.category || 'N/A',
        origin: aiPrediction.origin || 'N/A',
        amount: aiPrediction.amount || 0
      },
      final: {
        category: finalTransaction.category,
        origin: finalTransaction.origin,
        amount: finalTransaction.amount
      },
      wasCorrected,
      appVersion: '1.0.0-beta'
    });

    return true;
  } catch (error) {
    console.error("Silent log error:", error);
    // Não jogamos o erro pra cima para não travar o app do usuário
    return false;
  }
};