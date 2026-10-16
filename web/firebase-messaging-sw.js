importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyCOr1ypSj3BfiqtkTy1cc65TTZ_CtYCAAA",
  authDomain: "bhmh-fd67c.firebaseapp.com",
  projectId: "bhmh-fd67c",
  storageBucket: "bhmh-fd67c.firebasestorage.app",
  messagingSenderId: "740232636681",
  appId: "1:740232636681:web:a142c972f6804b07550bd8",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Received background message ", payload);
});

