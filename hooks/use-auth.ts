import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthStore, useSettings } from '../lib/state';

export function useAuth() {
  const { setUser, setAuthReady } = useAuthStore();
  const settings = useSettings();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Sync settings from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.staffLanguage) settings.setStaffLanguage(data.staffLanguage);
          if (data.guestLanguage) settings.setGuestLanguage(data.guestLanguage);
          if (data.topic) settings.setTopic(data.topic);
          if (data.staffVoice) settings.setStaffVoice(data.staffVoice);
          if (data.guestVoice) settings.setGuestVoice(data.guestVoice);
        } else {
          // Create initial user doc
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            staffLanguage: settings.staffLanguage,
            guestLanguage: settings.guestLanguage,
            topic: settings.topic,
            staffVoice: settings.staffVoice,
            guestVoice: settings.guestVoice,
          });
        }
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [setUser, setAuthReady]);

  // Sync settings TO Firestore when they change
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        staffLanguage: settings.staffLanguage,
        guestLanguage: settings.guestLanguage,
        topic: settings.topic,
        staffVoice: settings.staffVoice,
        guestVoice: settings.guestVoice,
      }, { merge: true });
    }
  }, [settings.staffLanguage, settings.guestLanguage, settings.topic, settings.staffVoice, settings.guestVoice]);
}
