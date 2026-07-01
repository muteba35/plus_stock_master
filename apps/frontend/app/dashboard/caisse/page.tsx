"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Camera,
  CheckCircle2,
  CreditCard,
  Loader2,
  Minus,
  Package,
  Plus,
  ReceiptText,
  ScanLine,
  ShoppingCart,
  Smartphone,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { formatMoney, getActiveBoutiqueCurrency } from "../inventaire/components/currency";
import { CashHeader, CashModal, CashSearch, fieldClass, primaryButton, secondaryButton } from "./components/cashier-ui";

type Product = {
  _id: string;
  nom: string;
  sku: string;
  prixVente: number;
  stock: number;
  unite: string;
  codeBarres?: string;
  image?: string;
  devise?: string;
  isActive?: boolean;
  categorieId?: { _id: string; nom: string };
};

type CartLine = { product: Product; quantity: number };
type ExchangeRate = { source: string; cible: string; taux: number };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const TVA_RATE = 0.16;

const getStoredPermissions = () => {
  if (typeof window === "undefined") return { permissions: [] as string[], isOwner: false };
  try {
    const permissions = JSON.parse(localStorage.getItem("user_permissions") || "[]") as string[];
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}") as { role?: string };
    return { permissions, isOwner: profile.role === "Admin Général" };
  } catch {
    return { permissions: [] as string[], isOwner: false };
  }
};

export default function CashRegisterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [currency, setCurrency] = useState("USD ($)");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [tvaEnabled, setTvaEnabled] = useState(true);
  const [tvaRate, setTvaRate] = useState(TVA_RATE);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [scannerStatus, setScannerStatus] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Espèces");
  const [received, setReceived] = useState("");
  const [{ permissions, isOwner }] = useState(getStoredPermissions);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);

  const canDiscount = isOwner || permissions.includes("APPLIQUER_REMISE");

  const getRate = useCallback((source?: string, cible?: string) => {
    const from = source || currency;
    const to = cible || currency;
    if (from === to) return 1;
    const direct = exchangeRates.find((rate) => rate.source === from && rate.cible === to);
    if (direct) return Number(direct.taux);
    const inverse = exchangeRates.find((rate) => rate.source === to && rate.cible === from);
    if (inverse) return 1 / Number(inverse.taux);
    return 0;
  }, [currency, exchangeRates]);

  const stopCameraScanner = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setCameraActive(false);
  }, []);

  const getPreferredCameraId = useCallback((devices: MediaDeviceInfo[]) => {
    const videoDevices = devices.filter((device) => device.kind === "videoinput");
    const external = videoDevices.find((device) => /usb|external|logitech|webcam|camera|caméra/i.test(device.label));
    const backCamera = videoDevices.find((device) => /back|rear|environment|arri[eè]re/i.test(device.label));
    return (external || backCamera || videoDevices[videoDevices.length - 1] || videoDevices[0])?.deviceId || "";
  }, []);

  const refreshCameraDevices = useCallback(async (requestPermission = false) => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];

    if (requestPermission && navigator.mediaDevices?.getUserMedia) {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      permissionStream.getTracks().forEach((track) => track.stop());
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === "videoinput");
    setCameraDevices(videoDevices);
    setSelectedCameraId((current) => current || getPreferredCameraId(videoDevices));
    return videoDevices;
  }, [getPreferredCameraId]);

  const fetchCurrencySettings = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/boutiques/settings/exchange-rates`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const nextCurrency = data.deviseReference || getActiveBoutiqueCurrency();
        setCurrency(nextCurrency);
        setTvaEnabled(data.tvaEnabled !== false);
        setTvaRate(Number(data.tvaRate ?? TVA_RATE));
        setExchangeRates(data.rates || []);
      }
    } catch {
      setCurrency(getActiveBoutiqueCurrency());
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/inventaire/produits`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Impossible de charger le catalogue.");
      }

      setProducts((data.data || []).filter((product: Product) => product.isActive !== false));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
    void fetchCurrencySettings();
  }, [fetchProducts, fetchCurrencySettings]);

  useEffect(() => {
    const syncCurrency = () => setCurrency(getActiveBoutiqueCurrency());
    syncCurrency();
    window.addEventListener("userProfileUpdated", syncCurrency);
    return () => window.removeEventListener("userProfileUpdated", syncCurrency);
  }, []);

  useEffect(() => {
    if (scannerOpen) void refreshCameraDevices();
    if (!scannerOpen) stopCameraScanner();
    return () => stopCameraScanner();
  }, [scannerOpen, refreshCameraDevices, stopCameraScanner]);

  useEffect(() => {
    if (!canDiscount && discount !== 0) setDiscount(0);
  }, [canDiscount, discount]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.categorieId?.nom).filter(Boolean) as string[])).sort(),
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.stock > 0 &&
          (category === "all" || product.categorieId?.nom === category) &&
          `${product.nom} ${product.sku} ${product.codeBarres || ""} ${product.categorieId?.nom || ""}`.toLowerCase().includes(search.toLowerCase())
      ),
    [products, category, search]
  );

  const cartCurrency = currency;
  const subtotalHT = cart.reduce((sum, line) => sum + (line.product.prixVente * getRate(line.product.devise || currency, currency)) * line.quantity, 0);
  const discountAmount = canDiscount ? (subtotalHT * Math.min(Math.max(discount, 0), 100)) / 100 : 0;
  const taxableAmount = subtotalHT - discountAmount;
  const activeTvaRate = tvaEnabled ? tvaRate : 0;
  const tvaAmount = taxableAmount * activeTvaRate;
  const totalTTC = taxableAmount + tvaAmount;
  const receivedAmount = Number(received || 0);
  const change = Math.max(0, receivedAmount - totalTTC);

  const convertedProductPrice = (product: Product) => product.prixVente * getRate(product.devise || currency, currency);
  const hasCurrencyConversion = (product: Product) => (product.devise || currency) !== currency;

  const addProduct = (product: Product, quantity = 1) => {
    const productCurrency = product.devise || "USD ($)";

    if (product.stock <= 0) {
      setMessage(`${product.nom} existe, mais son stock est épuisé.`);
      return;
    }

    const rate = getRate(productCurrency, currency);
    if (!rate) {
      setMessage(`Taux de change manquant pour ${productCurrency} vers ${currency}.`);
      return;
    }

    setMessage("");
    setCart((current) => {
      const existing = current.find((line) => line.product._id === product._id);

      if (existing) {
        const nextQuantity = Math.min(existing.quantity + quantity, product.stock);
        if (nextQuantity === existing.quantity) setMessage(`Stock maximum atteint pour ${product.nom}.`);
        return current.map((line) =>
          line.product._id === product._id ? { ...line, quantity: nextQuantity } : line
        );
      }

      return [...current, { product, quantity: Math.min(quantity, product.stock) }];
    });
  };

  const setLineQuantity = (id: string, rawValue: string | number) => {
    const value = Math.floor(Number(rawValue));
    setCart((current) =>
      current.map((line) => {
        if (line.product._id !== id) return line;
        if (!Number.isFinite(value) || value < 1) return { ...line, quantity: 1 };
        if (value > line.product.stock) {
          setMessage(`Stock disponible pour ${line.product.nom} : ${line.product.stock}.`);
          return { ...line, quantity: line.product.stock };
        }
        return { ...line, quantity: value };
      })
    );
  };

  const updateQuantity = (id: string, delta: number) => {
    const currentLine = cart.find((line) => line.product._id === id);
    if (!currentLine) return;
    setLineQuantity(id, currentLine.quantity + delta);
  };

  const resolveScannedProduct = useCallback((rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const product = products.find(
      (item) =>
        item.codeBarres?.trim().toLowerCase() === code.toLowerCase() ||
        item.sku.trim().toLowerCase() === code.toLowerCase()
    );

    if (!product) {
      setScannerStatus(`Aucun produit trouvé pour le code ${code}.`);
      setMessage(`Aucun produit trouvé pour le code ${code}.`);
      return;
    }

    addProduct(product);
    setScanCode("");
    setScannerStatus("");
    setScannerOpen(false);
    setMessage(`${product.nom} ajouté au panier par scan.`);
  }, [products, cartCurrency, cart.length]);

  const startCameraScanner = async (cameraId?: string) => {
    try {
      setScannerStatus("");

      if (!window.isSecureContext) {
        setScannerStatus("La caméra nécessite HTTPS ou localhost. Testez sur http://localhost:3000 ou sur le site Netlify en HTTPS.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerStatus("La caméra n'est pas disponible sur ce navigateur. Utilisez la saisie manuelle.");
        return;
      }

      stopCameraScanner();

      let nextCameraId = cameraId || selectedCameraId;
      let devices = await refreshCameraDevices(false);
      if (!nextCameraId || devices.length === 0 || devices.some((device) => !device.label)) {
        devices = await refreshCameraDevices(true);
      }
      if (!nextCameraId) nextCameraId = getPreferredCameraId(devices);
      if (nextCameraId) setSelectedCameraId(nextCameraId);

      setCameraActive(true);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));

      if (!videoRef.current) {
        setScannerStatus("La zone caméra n'est pas prête. Réessayez dans un instant.");
        setCameraActive(false);
        return;
      }

      const reader = new BrowserMultiFormatReader();
      scannerControlsRef.current = await reader.decodeFromConstraints(
        {
          video: nextCameraId
            ? {
                deviceId: { exact: nextCameraId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
          audio: false,
        },
        videoRef.current,
        (result, error) => {
          if (result) {
            stopCameraScanner();
            resolveScannedProduct(result.getText());
            return;
          }

          if (error?.name && !["NotFoundException", "ChecksumException", "FormatException"].includes(error.name)) {
            setScannerStatus("La lecture est active, mais aucun code lisible n'a encore été détecté.");
          }
        }
      );
      setScannerStatus("Caméra active. Placez un code-barres ou un QR code bien éclairé dans le cadre.");
    } catch (scanError) {
      const errorName = scanError instanceof Error ? scanError.name : "";
      const errorMessage = scanError instanceof Error ? scanError.message : "";
      const denied = errorName === "NotAllowedError" || errorMessage.toLowerCase().includes("permission");

      setScannerStatus(
        denied
          ? "Autorisation caméra refusée. Cliquez sur le cadenas du navigateur, autorisez la caméra, puis réessayez."
          : "Impossible d'ouvrir la caméra. Vérifiez qu'une caméra est disponible et qu'aucune autre application ne l'utilise."
      );
      stopCameraScanner();
    }
  };

  const handleManualScan = () => resolveScannedProduct(scanCode);

  const completePayment = async () => {
    try {
      setSaving(true);
      setMessage("");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/caisse/ventes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          clientNom: customer || "Client comptoir",
          paiement: paymentMethod,
          remisePourcentage: canDiscount ? discount : 0,
          devisePaiement: currency,
          montantRecu: paymentMethod === "Espèces" ? receivedAmount : totalTTC,
          lignes: cart.map((line) => ({
            produitId: line.product._id,
            quantite: line.quantity,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Impossible d'enregistrer la vente.");
      }

      setPaymentOpen(false);
      setCart([]);
      setDiscount(0);
      setCustomer("");
      setReceived("");
      setMessage(`Vente ${data.data?.reference || ""} enregistrée avec succès.${tvaEnabled ? " TVA incluse." : " Vente sans TVA."}`);
      await fetchProducts();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Erreur pendant l'encaissement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <CashHeader
        title="Accueil Caisse"
        subtitle={tvaEnabled ? "Sélectionnez les articles, appliquez la TVA et validez l'encaissement." : "Sélectionnez les articles et validez l'encaissement sans TVA."}
        action={
          <button onClick={() => setScannerOpen(true)} className={secondaryButton}>
            <ScanLine size={15} />
            Scanner
          </button>
        }
      />

      {message && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            message.toLowerCase().includes("succès") || message.startsWith("Vente")
              ? "bg-emerald-50 border-emerald-100 text-emerald-700"
              : "bg-amber-50 border-amber-100 text-amber-700"
          }`}
        >
          {message.toLowerCase().includes("succès") || message.startsWith("Vente") ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-5 items-start">
        <section className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-3">
            <CashSearch value={search} onChange={setSearch} placeholder="Rechercher un produit, une catégorie, un SKU ou un code-barres..." />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}>
              <option value="all">Toutes les catégories</option>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="animate-spin text-indigo-500" />
              <span className="text-xs">Chargement du catalogue...</span>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-xs text-rose-600">{error}</div>
          ) : (
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product._id}
                  onClick={() => addProduct(product)}
                  className="text-left border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
                >
                  <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={28} className="text-slate-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-slate-900 truncate">{product.nom}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {product.sku} · {product.stock} {product.unite}
                    </p>
                    <p className="text-sm font-black text-indigo-600 mt-2">
                      {formatMoney(product.prixVente, product.devise || "USD ($)")} HT
                      {hasCurrencyConversion(product) && getRate(product.devise || currency, currency) > 0 && (
                        <span className="block text-[11px] text-slate-500 font-bold mt-1">→ {formatMoney(convertedProductPrice(product), currency)} HT</span>
                      )}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden xl:sticky xl:top-4">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={17} className="text-indigo-600" />
              <h2 className="text-sm font-bold">Panier</h2>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-md">
              {cart.reduce((sum, line) => sum + line.quantity, 0)} article(s)
            </span>
          </div>

          <div className="p-4 max-h-[40vh] overflow-y-auto space-y-3">
            {cart.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart size={28} className="mx-auto text-slate-200" />
                <p className="text-xs text-slate-400 mt-3">Le panier est vide.</p>
              </div>
            ) : (
              cart.map((line) => (
                <div key={line.product._id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{line.product.nom}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {formatMoney(line.product.prixVente, line.product.devise || "USD ($)")} HT / unité · {formatMoney(line.product.prixVente * getRate(line.product.devise || currency, currency), currency)}
                    </p>
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    <button onClick={() => updateQuantity(line.product._id, -1)} className="w-7 h-8 flex items-center justify-center hover:bg-slate-50">
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={line.product.stock}
                      value={line.quantity}
                      onChange={(event) => setLineQuantity(line.product._id, event.target.value)}
                      className="w-12 h-8 text-center text-xs font-bold border-x border-slate-200 outline-none"
                      title={`Stock disponible : ${line.product.stock}`}
                    />
                    <button onClick={() => updateQuantity(line.product._id, 1)} className="w-7 h-8 flex items-center justify-center hover:bg-slate-50">
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => setCart((current) => current.filter((item) => item.product._id !== line.product._id))}
                    className="text-slate-300 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-slate-100 space-y-3">
            <label className="relative block">
              <UserRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Client (facultatif)" className={`${fieldClass} pl-9`} />
            </label>
            <label className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-500 flex-1">Remise (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={canDiscount ? discount : 0}
                disabled={!canDiscount}
                onChange={(event) => setDiscount(Number(event.target.value))}
                className="w-20 h-9 border border-slate-200 rounded-lg px-2 text-xs text-right disabled:bg-slate-50 disabled:text-slate-300"
                title={canDiscount ? "Remise" : "Permission APPLIQUER_REMISE requise"}
              />
            </label>
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-slate-500"><span>{tvaEnabled ? "Sous-total HT" : "Sous-total"}</span><span>{formatMoney(subtotalHT, cartCurrency)}</span></div>
              <div className="flex justify-between text-xs text-rose-500"><span>Remise</span><span>- {formatMoney(discountAmount, cartCurrency)}</span></div>
              {tvaEnabled && <div className="flex justify-between text-xs text-slate-500"><span>Base taxable</span><span>{formatMoney(taxableAmount, cartCurrency)}</span></div>}
              {tvaEnabled && <div className="flex justify-between text-xs text-slate-500"><span>TVA {(activeTvaRate * 100).toFixed(0)}%</span><span>{formatMoney(tvaAmount, cartCurrency)}</span></div>}
              <div className="flex justify-between text-lg font-black border-t border-dashed border-slate-200 pt-3"><span>{tvaEnabled ? "Total TTC" : "Total"}</span><span>{formatMoney(totalTTC, cartCurrency)}</span></div>
            </div>
            <button disabled={!cart.length} onClick={() => setPaymentOpen(true)} className={`${primaryButton} w-full h-12`}>
              <CreditCard size={16} />
              Encaisser
            </button>
          </div>
        </aside>
      </div>

      <CashModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        title="Scanner un article"
        subtitle="Ouvrez la caméra ou saisissez le code-barres/SKU."
        footer={
          <>
            <button onClick={() => setScannerOpen(false)} className={secondaryButton}>Fermer</button>
            <button onClick={handleManualScan} className={primaryButton}><ScanLine size={14} /> Ajouter</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 aspect-video flex items-center justify-center">
            <video ref={videoRef} className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`} muted playsInline />
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white/70 p-6">
                <Camera size={30} className="mx-auto mb-3" />
                <p className="text-xs font-bold">Caméra en attente</p>
                <p className="text-[11px] mt-1">Le navigateur demandera l'autorisation d'accès.</p>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Caméras détectées</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Choisissez la caméra interne ou externe à utiliser.</p>
              </div>
              <button
                type="button"
                onClick={() => void refreshCameraDevices(true)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:text-indigo-600"
              >
                Détecter
              </button>
            </div>

            {cameraDevices.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {cameraDevices.map((device, index) => {
                  const isSelected = selectedCameraId === device.deviceId;
                  return (
                    <button
                      key={device.deviceId || index}
                      type="button"
                      onClick={() => void startCameraScanner(device.deviceId)}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all ${isSelected ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"}`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Camera size={15} className="shrink-0" />
                        <span className="truncate text-xs font-black">{device.label || `Caméra ${index + 1}`}</span>
                      </span>
                      <span className="text-[10px] font-black uppercase">{isSelected ? "Active" : "Utiliser"}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-semibold">Aucune caméra listée pour l'instant. Cliquez sur Détecter puis autorisez l'accès caméra.</p>
            )}
          </div>

          <button type="button" onClick={() => void startCameraScanner()} className={`${secondaryButton} w-full`}>
            <Camera size={14} />
            Ouvrir la caméra sélectionnée
          </button>
          {scannerStatus && <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs font-semibold text-amber-700">{scannerStatus}</div>}
          <form onSubmit={(event) => { event.preventDefault(); handleManualScan(); }} className="space-y-2">
            <input autoFocus value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder="Code-barres ou SKU" className={fieldClass} />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pour tester sans vraie étiquette, tapez un SKU ou un code-barres enregistré puis cliquez sur Ajouter. La caméra lit uniquement une image de code-barres ou de QR code, pas un texte simple imprimé.
            </p>
          </form>
        </div>
      </CashModal>

      <CashModal
        open={paymentOpen}
        onClose={() => !saving && setPaymentOpen(false)}
        title="Encaissement"
        subtitle={`${tvaEnabled ? "Total TTC" : "Total"} à payer : ${formatMoney(totalTTC, cartCurrency)}`}
        footer={
          <>
            <button disabled={saving} onClick={() => setPaymentOpen(false)} className={secondaryButton}>Annuler</button>
            <button onClick={completePayment} disabled={saving || (paymentMethod === "Espèces" && receivedAmount < totalTTC)} className={primaryButton}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <ReceiptText size={14} />}
              Valider le paiement
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {[{ name: "Espèces", icon: Banknote }, { name: "Carte", icon: CreditCard }, { name: "Mobile", icon: Smartphone }].map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => setPaymentMethod(name)} className={`h-20 rounded-xl border flex flex-col items-center justify-center gap-2 text-xs font-bold ${paymentMethod === name ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}>
                <Icon size={19} />
                {name}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-500"><span>{tvaEnabled ? "Sous-total HT" : "Sous-total"}</span><strong>{formatMoney(subtotalHT, cartCurrency)}</strong></div>
            {tvaEnabled && <div className="flex justify-between text-xs text-slate-500"><span>TVA {(activeTvaRate * 100).toFixed(0)}%</span><strong>{formatMoney(tvaAmount, cartCurrency)}</strong></div>}
            <div className="flex justify-between text-sm text-slate-900 font-black pt-2 border-t border-slate-200"><span>{tvaEnabled ? "Total TTC" : "Total"}</span><span>{formatMoney(totalTTC, cartCurrency)}</span></div>
          </div>
          {paymentMethod === "Espèces" && (
            <>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Montant reçu ({currency})</span>
                <input autoFocus type="number" min={0} value={received} onChange={(event) => setReceived(event.target.value)} className={fieldClass} />
              </label>
              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-slate-500">Monnaie à rendre</span>
                  <strong>{formatMoney(change, currency)}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      </CashModal>
    </div>
  );
}
