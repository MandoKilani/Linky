import { useState, useRef, ChangeEvent, useEffect } from 'react';
import QRCodeStyling, { 
  DotType, 
  CornerSquareType, 
  GradientType
} from 'qr-code-styling';
import { 
  Download, Upload, Store, Palette, Settings, RefreshCcw, Check, Copy, Pencil,
  Layers, Grid, Sparkles, Clock, BarChart3, Save, LogIn, LogOut, Trash2, ExternalLink, History, ArrowLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { nanoid } from 'nanoid';
import { format, isAfter, parseISO } from 'date-fns';
import { 
  collection, doc, setDoc, getDoc, updateDoc, increment, query, where, onSnapshot, deleteDoc, orderBy
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './firebase';

const DOT_TYPES: { label: string; value: DotType }[] = [
  { label: 'Square', value: 'square' },
  { label: 'Dots', value: 'dots' },
  { label: 'Rounded', value: 'rounded' },
  { label: 'Extra Rounded', value: 'extra-rounded' },
  { label: 'Classy', value: 'classy' },
  { label: 'Classy Rounded', value: 'classy-rounded' },
];

const CORNER_SQUARE_TYPES: { label: string; value: CornerSquareType }[] = [
  { label: 'Square', value: 'square' },
  { label: 'Dot', value: 'dot' },
  { label: 'Extra Rounded', value: 'extra-rounded' },
];

const CORNER_DOT_TYPES: { label: string; value: 'dot' | 'square' | 'extra-rounded' }[] = [
  { label: 'Square', value: 'square' },
  { label: 'Dot', value: 'dot' },
  { label: 'Extra Rounded', value: 'extra-rounded' },
];

const TIPS = [
  {
    title: "High Contrast",
    text: "Use dark colors for the QR code and light colors for the background for better scanning across all devices."
  },
  {
    title: "Logo Size",
    text: "Keep your logo centered and not too large (under 30%) to ensure the code remains readable by scanners."
  },
  {
    title: "Test Before Printing",
    text: "Always scan your QR code with multiple devices before printing it on marketing materials to ensure it works."
  },
  {
    title: "Short URLs",
    text: "Use shorter URLs or our tracking links to keep the QR code pattern simple and easy to scan."
  }
];

const FUN_PRESETS = [
  { 
    name: 'Midnight', 
    fg: '#1e293b', fg2: '#0f172a', bg: '#ffffff',
    dots: 'square' as DotType, corners: 'square' as CornerSquareType, cornerDots: 'square' as const
  },
  { 
    name: 'Sunset', 
    fg: '#f43f5e', fg2: '#fb923c', bg: '#ffffff',
    dots: 'dots' as DotType, corners: 'dot' as CornerSquareType, cornerDots: 'dot' as const
  },
  { 
    name: 'Ocean', 
    fg: '#0ea5e9', fg2: '#2dd4bf', bg: '#ffffff',
    dots: 'rounded' as DotType, corners: 'extra-rounded' as CornerSquareType, cornerDots: 'extra-rounded' as const
  },
  { 
    name: 'Forest', 
    fg: '#10b981', fg2: '#064e3b', bg: '#ffffff',
    dots: 'classy' as DotType, corners: 'square' as CornerSquareType, cornerDots: 'square' as const
  },
  { 
    name: 'Lavender', 
    fg: '#8b5cf6', fg2: '#d946ef', bg: '#ffffff',
    dots: 'classy-rounded' as DotType, corners: 'extra-rounded' as CornerSquareType, cornerDots: 'extra-rounded' as const
  },
  { 
    name: 'Cyber', 
    fg: '#00ff00', fg2: '#0000ff', bg: '#000000',
    dots: 'square' as DotType, corners: 'square' as CornerSquareType, cornerDots: 'square' as const
  },
  { 
    name: 'Bubble Gum', 
    fg: '#ff7eb9', fg2: '#7afcff', bg: '#ffffff',
    dots: 'extra-rounded' as DotType, corners: 'extra-rounded' as CornerSquareType, cornerDots: 'extra-rounded' as const
  },
  { 
    name: 'Gold Rush', 
    fg: '#d4af37', fg2: '#f9d71c', bg: '#ffffff',
    dots: 'classy' as DotType, corners: 'dot' as CornerSquareType, cornerDots: 'dot' as const
  },
  { 
    name: 'Matrix', 
    fg: '#00ff41', fg2: '#008f11', bg: '#000000',
    dots: 'square' as DotType, corners: 'square' as CornerSquareType, cornerDots: 'square' as const
  },
  { 
    name: 'Soft Mint', 
    fg: '#4ade80', fg2: '#2dd4bf', bg: '#ffffff',
    dots: 'rounded' as DotType, corners: 'extra-rounded' as CornerSquareType, cornerDots: 'extra-rounded' as const
  },
];

export default function App() {
  // Navigation & Auth
  const [view, setView] = useState<'generator' | 'dashboard'>('generator');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingQR, setEditingQR] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // QR Config
  const [value, setValue] = useState('https://yourlink.com');
  const [fgColor, setFgColor] = useState('#000000');
  const [fgColor2, setFgColor2] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isBgTransparent, setIsBgTransparent] = useState(false);
  const [isGradient, setIsGradient] = useState(false);
  const [gradientType, setGradientType] = useState<GradientType>('linear');
  const [gradientRotation, setGradientRotation] = useState(0);
  const [dotsType, setDotsType] = useState<DotType>('square');
  const [cornersType, setCornersType] = useState<CornerSquareType>('square');
  const [cornersDotType, setCornersDotType] = useState<'dot' | 'square' | 'extra-rounded'>('square');
  const [size, setSize] = useState(300);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(0.4);
  const [logoBorderRadius, setLogoBorderRadius] = useState(0);
  const [hasLogoBorder, setHasLogoBorder] = useState(false);
  const [logoBorderWidth, setLogoBorderWidth] = useState(0);
  const [logoBorderColor, setLogoBorderColor] = useState('#ffffff');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [qrName, setQrName] = useState('My Linky QR');
  const [currentTip, setCurrentTip] = useState(0);

  // UI State
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCodes, setSavedCodes] = useState<any[]>([]);
  // Redirection State
  const [redirecting, setRedirecting] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !!params.get('id');
  });
  const [redirectError, setRedirectError] = useState<string | null>(null);

  const visibleCanvasRef = useRef<HTMLCanvasElement>(null);

  // Handle Redirection Logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrId = params.get('id');

    if (qrId) {
      setRedirecting(true);
      const fetchAndRedirect = async () => {
        const docRef = doc(db, 'qr_codes', qrId);
        try {
          let docSnap;
          try {
            docSnap = await getDoc(docRef);
          } catch (getErr) {
            handleFirestoreError(getErr, OperationType.GET, `qr_codes/${qrId}`);
            return;
          }

          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Check expiration
            if (data.expiresAt && isAfter(new Date(), parseISO(data.expiresAt))) {
              setRedirectError('This QR code has expired.');
              setRedirecting(false);
              return;
            }

            // Increment Scan Counter
            try {
              await updateDoc(docRef, {
                scans: increment(1)
              });
            } catch (incrementErr) {
              console.error('Failed to increment scan counter:', incrementErr);
              handleFirestoreError(incrementErr, OperationType.UPDATE, `qr_codes/${qrId}`);
              return;
            }

            // Redirect
            window.location.href = data.originalUrl;
          } else {
            setRedirectError('QR code not found.');
            setRedirecting(false);
          }
        } catch (err) {
          console.error('Redirect error:', err);
          setRedirectError('An error occurred during redirection.');
          setRedirecting(false);
        }
      };
      fetchAndRedirect();
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Saved Codes
  useEffect(() => {
    if (user && view === 'dashboard') {
      const q = query(
        collection(db, 'qr_codes'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setSavedCodes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubscribe();
    }
  }, [user, view]);

  const downloadStoredQR = async (qr: any, extension: 'png' | 'svg') => {
    const qrCode = new QRCodeStyling({
      width: 1000,
      height: 1000,
      data: qr.originalUrl,
      image: undefined, // Don't pass image to QRCodeStyling to avoid its internal logo handling
      dotsOptions: {
        type: qr.config.dotsType,
        color: qr.config.isGradient ? undefined : qr.config.fgColor,
        gradient: qr.config.isGradient ? {
          type: qr.config.gradientType,
          rotation: (qr.config.gradientRotation * Math.PI) / 180,
          colorStops: [
            { offset: 0, color: qr.config.fgColor },
            { offset: 1, color: qr.config.fgColor2 }
          ]
        } : undefined
      },
      backgroundOptions: { color: qr.config.isBgTransparent ? 'transparent' : qr.config.bgColor },
      imageOptions: { crossOrigin: 'anonymous', margin: 10, imageSize: qr.config.logoSize },
      cornersSquareOptions: {
        type: qr.config.cornersType,
        color: qr.config.isGradient ? undefined : qr.config.fgColor,
        gradient: qr.config.isGradient ? {
          type: qr.config.gradientType,
          rotation: (qr.config.gradientRotation * Math.PI) / 180,
          colorStops: [
            { offset: 0, color: qr.config.fgColor },
            { offset: 1, color: qr.config.fgColor2 }
          ]
        } : undefined
      },
      cornersDotOptions: {
        type: qr.config.cornersDotType || (qr.config.cornersType === 'dot' ? 'dot' : 'square'),
        color: qr.config.isGradient ? undefined : qr.config.fgColor,
        gradient: qr.config.isGradient ? {
          type: qr.config.gradientType,
          rotation: (qr.config.gradientRotation * Math.PI) / 180,
          colorStops: [
            { offset: 0, color: qr.config.fgColor },
            { offset: 1, color: qr.config.fgColor2 }
          ]
        } : undefined
      }
    });

    // Create a temporary container to render the QR
    const container = document.createElement('div');
    qrCode.append(container);

    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 600));

    const originalCanvas = container.querySelector('canvas');
    if (!originalCanvas) return;

    // Create a final canvas to apply our custom logo styles
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 1000;
    finalCanvas.height = 1000;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    if (!qr.config.isBgTransparent) {
      ctx.fillStyle = qr.config.bgColor;
      ctx.fillRect(0, 0, 1000, 1000);
    }

    // Draw the QR pattern
    // We need to clear the logo area if there's a logo
    if (qr.config.logo) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 1000;
      tempCanvas.height = 1000;
      const tCtx = tempCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(originalCanvas, 0, 0);
        
        const lSize = qr.config.logoSize || 0.4;
        const logoWidth = 1000 * lSize;
        const logoHeight = 1000 * lSize;
        
        // Hole should be exactly logo + border (no margin)
        const borderWidth = qr.config.hasLogoBorder ? (qr.config.logoBorderWidth || 0) * 3.33 : 0;
        const holeWidth = logoWidth + borderWidth;
        const holeHeight = logoHeight + borderWidth;
        const holeX = (1000 - holeWidth) / 2;
        const holeY = (1000 - holeHeight) / 2;
        const r = Math.min((qr.config.logoBorderRadius || 0) * (holeWidth / 2), holeWidth / 2);

        tCtx.globalCompositeOperation = 'destination-out';
        tCtx.beginPath();
        if (r >= holeWidth / 2) {
          tCtx.arc(holeX + holeWidth / 2, holeY + holeHeight / 2, holeWidth / 2, 0, Math.PI * 2);
        } else {
          tCtx.moveTo(holeX + r, holeY);
          tCtx.lineTo(holeX + holeWidth - r, holeY);
          tCtx.quadraticCurveTo(holeX + holeWidth, holeY, holeX + holeWidth, holeY + r);
          tCtx.lineTo(holeX + holeWidth, holeY + holeHeight - r);
          tCtx.quadraticCurveTo(holeX + holeWidth, holeY + holeHeight, holeX + holeWidth - r, holeY + holeHeight);
          tCtx.lineTo(holeX + r, holeY + holeHeight);
          tCtx.quadraticCurveTo(holeX, holeY + holeHeight, holeX, holeY + holeHeight - r);
          tCtx.lineTo(holeX, holeY + r);
          tCtx.quadraticCurveTo(holeX, holeY, holeX + r, holeY);
        }
        tCtx.fill();
        ctx.drawImage(tempCanvas, 0, 0);
      }
    } else {
      ctx.drawImage(originalCanvas, 0, 0);
    }

    // Draw the logo with custom styles
    if (qr.config.logo) {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = qr.config.logo;
      await new Promise(resolve => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const lSize = qr.config.logoSize || 0.4;
        const logoWidth = 1000 * lSize;
        const logoHeight = 1000 * lSize;
        const x = (1000 - logoWidth) / 2;
        const y = (1000 - logoHeight) / 2;
        const borderRadius = (qr.config.logoBorderRadius || 0) * (logoWidth / 2);
        const borderWidth = qr.config.hasLogoBorder ? (qr.config.logoBorderWidth || 0) * 3.33 : 0;

        ctx.save();
        
        // 1. Draw border first (so it's behind if we use transparency, but here we draw it on top later too)
        // Actually, best way: Draw border, then clip and draw image.
        
        if (borderWidth > 0) {
          ctx.beginPath();
          const br = (qr.config.logoBorderRadius || 0) * ((logoWidth + borderWidth) / 2);
          const bx = x - borderWidth / 2;
          const by = y - borderWidth / 2;
          const bw = logoWidth + borderWidth;
          const bh = logoHeight + borderWidth;
          
          if (br >= bw / 2) {
            ctx.arc(bx + bw / 2, by + bh / 2, bw / 2, 0, Math.PI * 2);
          } else {
            ctx.moveTo(bx + br, by);
            ctx.lineTo(bx + bw - br, by);
            ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
            ctx.lineTo(bx + bw, by + bh - br);
            ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
            ctx.lineTo(bx + br, by + bh);
            ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
            ctx.lineTo(bx, by + br);
            ctx.quadraticCurveTo(bx, by, bx + br, by);
          }
          ctx.closePath();
          ctx.fillStyle = qr.config.logoBorderColor || '#ffffff';
          ctx.fill();
        }

        // 2. Clip and draw image
        ctx.beginPath();
        if (borderRadius >= logoWidth / 2) {
          ctx.arc(x + logoWidth / 2, y + logoHeight / 2, logoWidth / 2, 0, Math.PI * 2);
        } else {
          const r = Math.min(borderRadius, logoWidth / 2);
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + logoWidth - r, y);
          ctx.quadraticCurveTo(x + logoWidth, y, x + logoWidth, y + r);
          ctx.lineTo(x + logoWidth, y + logoHeight - r);
          ctx.quadraticCurveTo(x + logoWidth, y + logoHeight, x + logoWidth - r, y + logoHeight);
          ctx.lineTo(x + r, y + logoHeight);
          ctx.quadraticCurveTo(x, y + logoHeight, x, y + logoHeight - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
        }
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
        ctx.restore();
      }
    }

    const dataUrl = finalCanvas.toDataURL(extension === 'png' ? 'image/png' : 'image/svg+xml');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${qr.name.replace(/\s+/g, '_')}_QR.${extension}`;
    link.click();
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  const saveQRCode = async () => {
    if (!user) {
      login();
      return;
    }
    
    setIsSaving(true);
    try {
      const id = editingQR ? editingQR.id : nanoid(10);
      const qrData = {
        id,
        shortId: id,
        name: qrName,
        originalUrl: value,
        expiresAt: expiresAt || null,
        createdAt: editingQR ? editingQR.createdAt : new Date().toISOString(),
        scans: editingQR ? (editingQR.scans || 0) : 0,
        ownerId: user.uid,
        config: {
          fgColor, fgColor2, bgColor, isBgTransparent, isGradient, gradientType, gradientRotation, dotsType, cornersType, cornersDotType, logo, logoSize,
          logoBorderRadius, hasLogoBorder, logoBorderWidth, logoBorderColor
        }
      };
      
      try {
        await setDoc(doc(db, 'qr_codes', id), qrData);
      } catch (writeErr) {
        handleFirestoreError(writeErr, OperationType.WRITE, `qr_codes/${id}`);
        return;
      }
      
      alert(editingQR ? 'QR Code updated!' : 'QR Code saved to your dashboard!');
      setEditingQR(null);
      setView('dashboard');
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save QR code.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteQR = async () => {
    if (!deletingId) return;
    try {
      try {
        await deleteDoc(doc(db, 'qr_codes', deletingId));
      } catch (deleteErr) {
        handleFirestoreError(deleteErr, OperationType.DELETE, `qr_codes/${deletingId}`);
        return;
      }
      setDeletingId(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete QR code.');
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
  };

  const startEditing = (qr: any) => {
    setEditingQR(qr);
    setValue(qr.originalUrl);
    setQrName(qr.name);
    setExpiresAt(qr.expiresAt || '');
    setFgColor(qr.config.fgColor);
    setFgColor2(qr.config.fgColor2);
    setBgColor(qr.config.bgColor);
    setIsBgTransparent(qr.config.isBgTransparent);
    setIsGradient(qr.config.isGradient);
    setGradientType(qr.config.gradientType);
    setGradientRotation(qr.config.gradientRotation);
    setDotsType(qr.config.dotsType);
    setCornersType(qr.config.cornersType);
    setCornersDotType(qr.config.cornersDotType);
    setLogo(qr.config.logo);
    setLogoSize(qr.config.logoSize);
    setLogoBorderRadius(qr.config.logoBorderRadius || 0);
    setHasLogoBorder(qr.config.hasLogoBorder || false);
    setLogoBorderWidth(qr.config.logoBorderWidth || 0);
    setLogoBorderColor(qr.config.logoBorderColor || '#ffffff');
    setView('generator');
  };

  const resetGenerator = () => {
    setEditingQR(null);
    setValue('https://yourlink.com');
    setQrName('My Linky QR');
    setExpiresAt('');
    setFgColor('#000000');
    setFgColor2('#000000');
    setBgColor('#ffffff');
    setIsBgTransparent(false);
    setIsGradient(false);
    setGradientType('linear');
    setGradientRotation(0);
    setDotsType('square');
    setCornersType('square');
    setCornersDotType('square');
    setLogo(null);
    setLogoSize(0.4);
  };

  const downloadQR = () => {
    const canvas = visibleCanvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `store-qr-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyPreset = (preset: typeof FUN_PRESETS[0]) => {
    setFgColor(preset.fg);
    setFgColor2(preset.fg2);
    setBgColor(preset.bg);
    setIsBgTransparent(false);
    setIsGradient(preset.fg !== preset.fg2);
    if (preset.dots) setDotsType(preset.dots);
    if (preset.corners) setCornersType(preset.corners);
    if (preset.cornerDots) setCornersDotType(preset.cornerDots);
  };

  const reset = () => {
    setValue('https://yourlink.com');
    setFgColor('#000000');
    setFgColor2('#000000');
    setBgColor('#ffffff');
    setIsBgTransparent(false);
    setIsGradient(false);
    setGradientRotation(0);
    setDotsType('square');
    setCornersType('square');
    setCornersDotType('square');
    setSize(300);
    setLogo(null);
    setLogoSize(0.4);
    setLogoBorderRadius(0);
    setLogoBorderWidth(0);
    setLogoBorderColor('#ffffff');
    setExpiresAt('');
    setQrName('My Linky QR');
  };

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium tracking-tight">Redirecting to store...</p>
        </div>
      </div>
    );
  }

  if (redirectError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-12 rounded-[48px] shadow-xl border border-slate-100 text-center max-w-md">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="text-rose-500 w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Oops!</h1>
          <p className="text-slate-500 mb-8">{redirectError}</p>
          <button 
            onClick={() => window.location.href = window.location.origin}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { resetGenerator(); setView('generator'); }}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Store className="text-white w-5 h-5" />
            </div>
            <span className="font-bold tracking-tight text-xl">Linky</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    if (view === 'generator') {
                      setView('dashboard');
                    } else {
                      // If we were editing, we stay in edit mode when going back? 
                      // Or just reset? Let's reset for a clean "Create New" experience.
                      if (!editingQR) resetGenerator(); 
                      setView('generator');
                    }
                  }}
                  className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-100"
                >
                  {view === 'generator' ? <History className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  {view === 'generator' ? 'History' : (editingQR ? 'Continue Editing' : 'Back to Generator')}
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                  <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-slate-200" alt="" />
                  <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={login}
                className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view === 'generator' ? (
          <motion.main 
            key="generator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8"
          >
            <div className="flex flex-col lg:grid lg:grid-cols-[1fr_420px] gap-8 lg:gap-10 items-start">
              
              {/* Preview Section (First on mobile, sticky) */}
              <div className="w-full order-1 lg:order-2 sticky top-16 lg:top-28 z-40 bg-white/70 backdrop-blur-2xl lg:backdrop-blur-none lg:bg-transparent -mx-4 px-4 py-2 lg:mx-0 lg:px-0 lg:py-0 space-y-2 md:space-y-6 border-b border-slate-200/40 lg:border-none transition-all duration-300 shadow-sm lg:shadow-none">
                <div className="flex items-center justify-between lg:justify-start gap-2 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                    <h2 className="text-[9px] md:text-xs font-bold uppercase tracking-[0.2em]">Preview</h2>
                  </div>
                  <div className="lg:hidden flex items-center gap-1 text-[9px] font-medium text-slate-400">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span>Active</span>
                  </div>
                </div>

                <div className="bg-white/40 lg:bg-white p-2 md:p-10 rounded-[20px] md:rounded-[48px] shadow-sm md:shadow-2xl shadow-indigo-900/5 border border-white/50 lg:border-slate-100 flex flex-row lg:flex-col items-center gap-3 md:gap-10">
                  <div className="relative shrink-0 scale-[0.5] md:scale-100 origin-center -my-8 md:my-0 -mx-6 md:mx-0">
                    <QRPreview
                      width={size}
                      height={size}
                      data={value}
                      image={logo || undefined}
                      canvasRef={visibleCanvasRef}
                      dotsOptions={{
                        type: dotsType,
                      }}
                      backgroundOptions={{ color: bgColor }}
                      imageOptions={{ crossOrigin: 'anonymous', margin: 10, imageSize: logoSize }}
                      cornersSquareOptions={{
                        type: cornersType,
                      }}
                      cornersDotOptions={{
                        type: cornersDotType,
                      }}
                      config={{
                        fgColor, fgColor2, bgColor, isBgTransparent, isGradient, gradientType, gradientRotation, dotsType, cornersType, cornersDotType, logo, logoSize,
                        logoBorderRadius, hasLogoBorder, logoBorderWidth, logoBorderColor
                      }}
                    />
                  </div>

                  <div className="flex-1 lg:w-full space-y-1.5 md:space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-2 gap-1.5 md:gap-3">
                      <button 
                        onClick={downloadQR}
                        className="bg-slate-900 text-white py-1.5 md:py-4 rounded-lg md:rounded-2xl font-bold flex items-center justify-center gap-1 md:gap-2 hover:bg-black transition-all text-[9px] md:text-base shadow-sm"
                      >
                        <Download className="w-2.5 h-2.5 md:w-5 md:h-5" />
                        PNG
                      </button>
                      <button 
                        onClick={saveQRCode}
                        disabled={isSaving}
                        className="bg-indigo-600 text-white py-1.5 md:py-4 rounded-lg md:rounded-2xl font-bold flex items-center justify-center gap-1 md:gap-2 hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 text-[9px] md:text-base"
                      >
                        {isSaving ? <RefreshCcw className="w-2.5 h-2.5 md:w-5 md:h-5 animate-spin" /> : <Save className="w-2.5 h-2.5 md:w-5 md:h-5" />}
                        {isSaving ? '...' : (editingQR ? 'Update' : 'Save')}
                      </button>
                    </div>
                    <p className="text-center text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden md:block">
                      {editingQR ? 'Updating will save all current styles' : 'Saving enables scan tracking & history'}
                    </p>
                  </div>
                </div>

                {/* Tips Card - Hidden on mobile sticky to save space */}
                <div className="hidden lg:block bg-slate-900 text-white p-8 rounded-[32px] space-y-4 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl" />
                  
                  <div className="flex items-center justify-between relative z-10">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Tips</h3>
                    <button 
                      onClick={() => setCurrentTip((prev) => (prev + 1) % TIPS.length)}
                      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentTip}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-2 relative z-10"
                    >
                      <h4 className="text-base font-bold text-slate-100">{TIPS[currentTip].title}</h4>
                      <p className="text-sm leading-relaxed text-slate-300 font-medium">
                        {TIPS[currentTip].text}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex gap-1.5 pt-2 relative z-10">
                    {TIPS.map((_, i) => (
                      <div 
                        key={i}
                        className={`h-1 rounded-full transition-all ${i === currentTip ? 'w-4 bg-indigo-500' : 'w-1 bg-white/20'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Controls Section */}
              <div className="w-full order-2 lg:order-1 space-y-4 md:space-y-6">
                {/* Content Input */}
                <section className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Settings className="w-4 h-4" />
                    <h2 className="text-xs font-bold uppercase tracking-widest">Content & Tracking</h2>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <div className="relative group">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Enter URL or text..."
                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 md:px-6 md:py-5 text-base md:text-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                      />
                      <button 
                        onClick={() => copyToClipboard(value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-slate-400" />}
                      </button>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">QR Name (for history)</label>
                        <input 
                          type="text" 
                          value={qrName}
                          onChange={(e) => setQrName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Expiration Date (Optional)</label>
                        <input 
                          type="datetime-local" 
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Style Section Separator */}
                <div className="relative py-4 md:py-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <div className="bg-[#f8fafc] px-6 md:px-10 flex items-center gap-3 md:gap-4">
                      <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-slate-400">Style & Design</span>
                      <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Appearance Section */}
                  <section className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Palette className="w-4 h-4" />
                      <h2 className="text-xs font-bold uppercase tracking-widest">Colors & Style</h2>
                    </div>
                    
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">Gradient Mode</span>
                          <button 
                            onClick={() => setIsGradient(!isGradient)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isGradient ? 'bg-indigo-600' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isGradient ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Color 1</label>
                            <div className="flex items-center gap-2 p-2 border border-slate-100 rounded-xl">
                              <input 
                                type="color" 
                                value={fgColor} 
                                onChange={(e) => setFgColor(e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                              />
                              <span className="text-[10px] font-mono uppercase">{fgColor}</span>
                            </div>
                          </div>
                          {isGradient && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Color 2</label>
                              <div className="flex items-center gap-2 p-2 border border-slate-100 rounded-xl">
                                <input 
                                  type="color" 
                                  value={fgColor2} 
                                  onChange={(e) => setFgColor2(e.target.value)}
                                  className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                                />
                                <span className="text-[10px] font-mono uppercase">{fgColor2}</span>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {isGradient && (
                          <div className="space-y-4 pt-2">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setGradientType('linear')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${gradientType === 'linear' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}
                              >
                                Linear
                              </button>
                              <button 
                                onClick={() => setGradientType('radial')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${gradientType === 'radial' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}
                              >
                                Radial
                              </button>
                            </div>
                            
                            {gradientType === 'linear' && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                  <span>Rotation</span>
                                  <span>{gradientRotation}°</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="360" 
                                  value={gradientRotation}
                                  onChange={(e) => setGradientRotation(Number(e.target.value))}
                                  className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 p-4 md:p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">Transparent BG</span>
                          <button 
                            onClick={() => setIsBgTransparent(!isBgTransparent)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isBgTransparent ? 'bg-indigo-600' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isBgTransparent ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                        
                        {!isBgTransparent && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <span className="text-xs font-bold text-slate-500">Background Color</span>
                            <div className="flex items-center gap-2 p-1.5 border border-slate-100 rounded-xl">
                              <input 
                                type="color" 
                                value={bgColor} 
                                onChange={(e) => setBgColor(e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                              />
                              <span className="text-[10px] font-mono uppercase">{bgColor}</span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Sparkles className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Fun Presets</span>
                        </div>
                        <button 
                          onClick={() => {
                            const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
                            setFgColor(randomColor());
                            setFgColor2(randomColor());
                            setIsGradient(Math.random() > 0.3);
                            setGradientRotation(Math.floor(Math.random() * 360));
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1"
                        >
                          <RefreshCcw className="w-2.5 h-2.5" />
                          Randomize
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {FUN_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => applyPreset(preset)}
                            className="group relative w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white shadow-sm overflow-hidden transition-transform hover:scale-110 active:scale-95"
                            title={preset.name}
                          >
                            <div 
                              className="absolute inset-0"
                              style={{ background: `linear-gradient(135deg, ${preset.fg}, ${preset.fg2})` }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Shapes Section */}
                  <section className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Grid className="w-4 h-4" />
                      <h2 className="text-xs font-bold uppercase tracking-widest">Shapes & Patterns</h2>
                    </div>

                    <div className="space-y-4 md:space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Module Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          {DOT_TYPES.map((type) => (
                            <button
                              key={type.value}
                              onClick={() => setDotsType(type.value)}
                              className={`px-3 py-2 md:py-2.5 rounded-xl text-xs font-bold transition-all ${dotsType === type.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-100 text-slate-600 hover:border-indigo-200'}`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Corner Style</label>
                        <div className="grid grid-cols-3 gap-2">
                          {CORNER_SQUARE_TYPES.map((type) => (
                            <button
                              key={type.value}
                              onClick={() => setCornersType(type.value)}
                              className={`px-2 py-2 md:py-2.5 rounded-xl text-[10px] font-bold transition-all ${cornersType === type.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-100 text-slate-600 hover:border-indigo-200'}`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Corner Dots Style</label>
                        <div className="grid grid-cols-3 gap-2">
                          {CORNER_DOT_TYPES.map((type) => (
                            <button
                              key={type.value}
                              onClick={() => setCornersDotType(type.value)}
                              className={`px-2 py-2 md:py-2.5 rounded-xl text-[10px] font-bold transition-all ${cornersDotType === type.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-100 text-slate-600 hover:border-indigo-200'}`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 pt-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-400 uppercase tracking-wider">QR Size</span>
                          <span className="text-indigo-600">{size}px</span>
                        </div>
                        <input 
                          type="range" 
                          min="200" 
                          max="600" 
                          step="10"
                          value={size}
                          onChange={(e) => setSize(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                {/* Branding Section Separator */}
                <div className="relative py-4 md:py-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <div className="bg-[#f8fafc] px-6 md:px-10 flex items-center gap-3 md:gap-4">
                      <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-slate-400">Branding</span>
                      <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                    </div>
                  </div>
                </div>

                <section className="space-y-4 md:space-y-6">
                  <div className="grid md:grid-cols-2 gap-4 md:gap-6 items-start">
                    <label className="relative overflow-hidden flex flex-col items-center justify-center w-full h-48 md:h-64 border-2 border-dashed border-slate-200 rounded-[32px] md:rounded-[40px] cursor-pointer hover:bg-white hover:border-indigo-300 transition-all group bg-slate-50/50 shadow-inner">
                      {logo ? (
                        <div className="relative w-full h-full flex items-center justify-center p-8">
                          <img 
                            src={logo} 
                            alt="Logo Preview" 
                            className="max-w-full max-h-full object-contain transition-all duration-300"
                            style={{
                              borderRadius: `${logoBorderRadius * 50}%`,
                              border: hasLogoBorder && logoBorderWidth > 0 ? `${logoBorderWidth / 2}px solid ${logoBorderColor}` : 'none',
                              boxShadow: hasLogoBorder && logoBorderWidth > 0 ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                            }}
                          />
                          <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <div className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                              <Upload className="w-3 h-3 text-indigo-600" />
                              <span className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">Change Logo</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                          </div>
                          <p className="text-sm text-slate-500 font-bold">Upload Logo</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">PNG, JPG or SVG</p>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>

                    {logo && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6 p-8 bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-indigo-900/5"
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo Size</span>
                            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold">{Math.round(logoSize * 100)}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.1" 
                            max="0.5" 
                            step="0.05"
                            value={logoSize}
                            onChange={(e) => setLogoSize(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Corner Radius</span>
                            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold">{Math.round(logoBorderRadius * 100)}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.1"
                            value={logoBorderRadius}
                            onChange={(e) => setLogoBorderRadius(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo Border</span>
                            <button 
                              onClick={() => setHasLogoBorder(!hasLogoBorder)}
                              className={`w-10 h-5 rounded-full transition-colors relative ${hasLogoBorder ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${hasLogoBorder ? 'left-5.5' : 'left-0.5'}`} />
                            </button>
                          </div>
                        </div>

                        {hasLogoBorder && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6">
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Border Width</span>
                                <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold">{logoBorderWidth}px</span>
                              </div>
                              <input 
                                type="range" 
                                min="1" 
                                max="20" 
                                step="1"
                                value={logoBorderWidth}
                                onChange={(e) => setLogoBorderWidth(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                              />
                            </div>

                            <div className="space-y-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Border Color</span>
                              <div className="flex gap-3">
                                <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                                  <input 
                                    type="color" 
                                    value={logoBorderColor}
                                    onChange={(e) => setLogoBorderColor(e.target.value)}
                                    className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer"
                                  />
                                </div>
                                <input 
                                  type="text" 
                                  value={logoBorderColor}
                                  onChange={(e) => setLogoBorderColor(e.target.value)}
                                  className="flex-1 px-4 py-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}

                        <div className="pt-4">
                          <button 
                            onClick={() => setLogo(null)}
                            className="w-full py-4 text-[10px] text-rose-500 font-black uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                          >
                            Remove Logo
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </section>
              </div>

            </div>
          </motion.main>
        ) : (
          <motion.main 
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-7xl mx-auto px-6 py-8"
          >
            <div className="flex items-center justify-between mb-12">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Your QR History</h1>
                <p className="text-slate-500 font-medium">Manage your saved codes and track their performance.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {savedCodes.length === 0 ? (
                <div className="col-span-full py-24 text-center bg-white rounded-[48px] border border-slate-100">
                  <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest">No saved codes yet</p>
                </div>
              ) : (
                savedCodes.map((qr) => (
                  <motion.div 
                    layout
                    key={qr.id}
                    className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg truncate max-w-[170px]">{qr.name}</h3>
                        <p className="text-xs text-slate-400 font-medium truncate max-w-[170px]">{qr.originalUrl}</p>
                      </div>
                      <div className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full flex items-center gap-1 text-[11px] font-bold shrink-0 self-start">
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>{qr.scans || 0} scans</span>
                      </div>
                    </div>

                    <div className="aspect-square bg-slate-50 rounded-2xl flex items-center justify-center mb-6 overflow-hidden p-4">
                      <QRPreview
                        width={200}
                        height={200}
                        data={qr.originalUrl}
                        image={qr.config.logo || undefined}
                        dotsOptions={{
                          type: qr.config.dotsType,
                        }}
                        backgroundOptions={{ color: qr.config.bgColor }}
                        imageOptions={{ crossOrigin: 'anonymous', margin: 10, imageSize: qr.config.logoSize }}
                        cornersSquareOptions={{
                          type: qr.config.cornersType,
                        }}
                        cornersDotOptions={{
                          type: qr.config.cornersDotType,
                        }}
                        config={qr.config}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <button 
                        onClick={() => downloadStoredQR(qr, 'png')}
                        className="flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PNG
                      </button>
                      <button 
                        onClick={() => downloadStoredQR(qr, 'svg')}
                        className="flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        SVG
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {qr.expiresAt ? `Expires ${format(parseISO(qr.expiresAt), 'MMM d, h:mm a')}` : 'No Expiry'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => startEditing(qr)}
                          className="flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button 
                          onClick={() => confirmDelete(qr.id)}
                          className="flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-500 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[40px] p-10 shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-rose-500" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Delete QR Code?</h2>
              <p className="text-slate-500 text-sm font-medium mb-8">
                This action cannot be undone. All scan data for this code will be lost.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-4 rounded-2xl font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteQR}
                  className="flex-1 bg-rose-50 text-rose-600 py-4 rounded-2xl font-bold hover:bg-rose-100 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto px-6 py-10 md:py-16 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <Store className="w-5 h-5" />
            <span className="font-bold tracking-tight">Linky</span>
          </div>
          <p className="text-xs md:text-sm text-slate-400 font-medium text-center md:text-left">
            © 2026 Linky. Professional branding tools for everyone.
          </p>
          <div className="flex gap-6 md:gap-10">
            <a href="#" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper component to render QR in dashboard without re-initializing full logic
function QRPreview({ width, height, data, image, dotsOptions, backgroundOptions, imageOptions, cornersSquareOptions, cornersDotOptions, config, canvasRef }: any) {
  const hiddenRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const visibleRef = canvasRef || internalRef;
  const qrInstanceRef = useRef<any>(null);

  const draw = (retryCount = 0) => {
    const visibleCanvas = visibleRef.current;
    const hiddenCanvas = hiddenRef.current?.querySelector('canvas');
    
    if (!visibleCanvas || !hiddenCanvas) {
      if (retryCount < 10) setTimeout(() => draw(retryCount + 1), 100);
      return;
    }

    const ctx = visibleCanvas.getContext('2d');
    if (!ctx) return;

    const w = visibleCanvas.width;
    const h = visibleCanvas.height;

    // Check if hidden canvas has content
    const hiddenCtx = hiddenCanvas.getContext('2d');
    if (hiddenCtx) {
      const pixelData = hiddenCtx.getImageData(0, 0, w, h).data;
      let hasContent = false;
      for (let i = 3; i < pixelData.length; i += 4) {
        if (pixelData[i] > 0) {
          hasContent = true;
          break;
        }
      }
      if (!hasContent && retryCount < 10) {
        setTimeout(() => draw(retryCount + 1), 100);
        return;
      }
    }

    ctx.clearRect(0, 0, w, h);
    if (!config.isBgTransparent) {
      ctx.fillStyle = config.bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = w;
    fgCanvas.height = h;
    const fgCtx = fgCanvas.getContext('2d');
    if (!fgCtx) return;

    if (config.isGradient) {
      let gradient;
      if (config.gradientType === 'linear') {
        const rad = (config.gradientRotation * Math.PI) / 180;
        const x1 = w / 2 - Math.cos(rad) * w / 2;
        const y1 = h / 2 - Math.sin(rad) * h / 2;
        const x2 = w / 2 + Math.cos(rad) * w / 2;
        const y2 = h / 2 + Math.sin(rad) * h / 2;
        gradient = fgCtx.createLinearGradient(x1, y1, x2, y2);
      } else {
        gradient = fgCtx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.sqrt(w*w + h*h) / 2);
      }
      gradient.addColorStop(0, config.fgColor);
      gradient.addColorStop(1, config.fgColor2);
      fgCtx.fillStyle = gradient;
    } else {
      fgCtx.fillStyle = config.fgColor;
    }
    fgCtx.fillRect(0, 0, w, h);

    fgCtx.globalCompositeOperation = 'destination-in';
    fgCtx.drawImage(hiddenCanvas, 0, 0);
    
    // Clear the logo area on fgCanvas so it doesn't show the QR pattern behind the logo
    if (image) {
      const lSize = config.logoSize || 0.4;
      const logoWidth = w * lSize;
      const logoHeight = h * lSize;
      
      fgCtx.globalCompositeOperation = 'destination-out';
      
      // Calculate hole size based on logo size + border (no margin)
      const borderWidth = config.hasLogoBorder ? (config.logoBorderWidth || 0) : 0;
      const holeWidth = logoWidth + borderWidth;
      const holeHeight = logoHeight + borderWidth;
      const holeX = (w - holeWidth) / 2;
      const holeY = (h - holeHeight) / 2;

      // Create a rounded hole that matches the logo's corner radius
      const r = Math.min((config.logoBorderRadius || 0) * (holeWidth / 2), holeWidth / 2);
      
      fgCtx.beginPath();
      if (r >= holeWidth / 2) {
        fgCtx.arc(holeX + holeWidth / 2, holeY + holeHeight / 2, holeWidth / 2, 0, Math.PI * 2);
      } else {
        fgCtx.moveTo(holeX + r, holeY);
        fgCtx.lineTo(holeX + holeWidth - r, holeY);
        fgCtx.quadraticCurveTo(holeX + holeWidth, holeY, holeX + holeWidth, holeY + r);
        fgCtx.lineTo(holeX + holeWidth, holeY + holeHeight - r);
        fgCtx.quadraticCurveTo(holeX + holeWidth, holeY + holeHeight, holeX + holeWidth - r, holeY + holeHeight);
        fgCtx.lineTo(holeX + r, holeY + holeHeight);
        fgCtx.quadraticCurveTo(holeX, holeY + holeHeight, holeX, holeY + holeHeight - r);
        fgCtx.lineTo(holeX, holeY + r);
        fgCtx.quadraticCurveTo(holeX, holeY, holeX + r, holeY);
      }
      fgCtx.fill();
      fgCtx.globalCompositeOperation = 'source-over';
    }

    ctx.drawImage(fgCanvas, 0, 0);

    // Draw the actual logo on top
    if (logoImgRef.current) {
      const lSize = config.logoSize || 0.4;
      const logoWidth = w * lSize;
      const logoHeight = h * lSize;
      const x = (w - logoWidth) / 2;
      const y = (h - logoHeight) / 2;

      const borderRadius = (config.logoBorderRadius || 0) * (logoWidth / 2);
      const borderWidth = config.hasLogoBorder ? (config.logoBorderWidth || 0) : 0;
      
      ctx.save();
      
      // 1. Draw border first
      if (borderWidth > 0) {
        ctx.beginPath();
        const br = (config.logoBorderRadius || 0) * ((logoWidth + borderWidth) / 2);
        const bx = x - borderWidth / 2;
        const by = y - borderWidth / 2;
        const bw = logoWidth + borderWidth;
        const bh = logoHeight + borderWidth;
        
        if (br >= bw / 2) {
          ctx.arc(bx + bw / 2, by + bh / 2, bw / 2, 0, Math.PI * 2);
        } else {
          ctx.moveTo(bx + br, by);
          ctx.lineTo(bx + bw - br, by);
          ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
          ctx.lineTo(bx + bw, by + bh - br);
          ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
          ctx.lineTo(bx + br, by + bh);
          ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
          ctx.lineTo(bx, by + br);
          ctx.quadraticCurveTo(bx, by, bx + br, by);
        }
        ctx.closePath();
        ctx.fillStyle = config.logoBorderColor || '#ffffff';
        ctx.fill();
      }

      // 2. Clip and draw image
      ctx.beginPath();
      if (borderRadius >= logoWidth / 2) {
        // Circle
        ctx.arc(x + logoWidth / 2, y + logoHeight / 2, logoWidth / 2, 0, Math.PI * 2);
      } else {
        // Rounded Rect
        const r = Math.min(borderRadius, logoWidth / 2);
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + logoWidth - r, y);
        ctx.quadraticCurveTo(x + logoWidth, y, x + logoWidth, y + r);
        ctx.lineTo(x + logoWidth, y + logoHeight - r);
        ctx.quadraticCurveTo(x + logoWidth, y + logoHeight, x + logoWidth - r, y + logoHeight);
        ctx.lineTo(x + r, y + logoHeight);
        ctx.quadraticCurveTo(x, y + logoHeight, x, y + logoHeight - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImgRef.current, x, y, logoWidth, logoHeight);
      
      ctx.restore();
    }
  };

  useEffect(() => {
    if (image) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = image;
      img.onload = () => {
        logoImgRef.current = img;
        draw();
      };
    } else {
      logoImgRef.current = null;
      draw();
    }
  }, [image]);

  useEffect(() => {
    qrInstanceRef.current = new QRCodeStyling({
      width, height, data, 
      image: undefined, // Don't pass image to QRCodeStyling to avoid its internal logo handling
      dotsOptions: { ...dotsOptions, color: '#000000' }, 
      backgroundOptions: { color: 'transparent' }, 
      imageOptions, 
      cornersSquareOptions: { ...cornersSquareOptions, color: '#000000' }, 
      cornersDotOptions: { 
        type: cornersDotOptions?.type || config.cornersDotType || (cornersSquareOptions.type === 'dot' ? 'dot' : 'square'),
        color: '#000000' 
      }
    });
    
    if (hiddenRef.current) {
      hiddenRef.current.innerHTML = '';
      qrInstanceRef.current.append(hiddenRef.current);
      setTimeout(draw, 150);
    }
  }, [width, height, data, image, dotsOptions?.type, cornersSquareOptions?.type, cornersDotOptions?.type]);

  // Trigger draw when config changes (colors, logo settings)
  useEffect(() => {
    draw();
  }, [config.fgColor, config.fgColor2, config.bgColor, config.isBgTransparent, config.isGradient, config.gradientType, config.gradientRotation, config.logoSize, config.logoBorderRadius, config.hasLogoBorder, config.logoBorderWidth, config.logoBorderColor]);

  return (
    <div className="relative">
      <div 
        ref={hiddenRef} 
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }} 
      />
      <canvas ref={visibleRef} width={width} height={height} className="rounded-2xl" />
    </div>
  );
}
