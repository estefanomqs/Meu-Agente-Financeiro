/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { Transaction } from '../types';

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
  aiPrediction: Partial<Transaction> | null,
  finalTransaction: Omit<Transaction, 'id'>
) => {
  try {
    // 1. Correção da Lógica 'wasCorrected' (Sintaxe arrumada)
    // Verifica se ALGUM campo importante foi alterado pelo usuário
    const wasCorrected = aiPrediction ? (
      aiPrediction.category !== finalTransaction.category ||
      aiPrediction.amount !== finalTransaction.amount ||
      aiPrediction.date !== finalTransaction.date ||
      aiPrediction.paymentMethod !== finalTransaction.paymentMethod ||
      aiPrediction.account !== finalTransaction.account ||
      aiPrediction.isInstallment !== finalTransaction.isInstallment ||
      aiPrediction.installmentsTotal !== finalTransaction.installmentsTotal
    ) : false;

    // 2. Proteção contra 'undefined' (O segredo para parar de falhar)
    // O Firestore rejeita undefined, então usamos || null ou valores padrão
    await addDoc(collection(db, 'smartbar_analytics'), {
      userId,
      timestamp: new Date().toISOString(),
      rawInput,
      prediction: {
        category: aiPrediction?.category || 'N/A',
        origin: aiPrediction?.origin || 'N/A',
        amount: aiPrediction?.amount || 0,
        paymentMethod: aiPrediction?.paymentMethod || 'N/A',
        account: aiPrediction?.account || 'N/A',
        date: aiPrediction?.date || null,
        isInstallment: aiPrediction?.isInstallment || false,
        installmentsTotal: aiPrediction?.installmentsTotal || 0
      },
      final: {
        category: finalTransaction.category || 'Outros',
        origin: finalTransaction.origin || 'Desconhecido',
        amount: finalTransaction.amount || 0,
        paymentMethod: finalTransaction.paymentMethod || 'N/A',
        account: finalTransaction.account || 'N/A',
        date: finalTransaction.date || new Date().toISOString(),
        isInstallment: finalTransaction.isInstallment || false,
        installmentsTotal: finalTransaction.installmentsTotal || 0
      },
      wasCorrected,
      appVersion: '1.0.0-beta'
    });

    return true;
  } catch (error) {
    console.error("Erro ao salvar log no Firebase:", error);
    return false;
  }
};