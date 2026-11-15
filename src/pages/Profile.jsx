// import { useState, useRef } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { useNavigate } from 'react-router-dom';
// import BottomNav from '../components/BottomNav.jsx';
// import { updateProfile, logout } from '../store/authSlice';
// import '../styles/app-shell.css';

// const USER_TYPES = [
//   { value: 'farmer', label: 'Farmer' },
//   { value: 'retailer', label: 'Retailer' },
//   { value: 'distributor', label: 'Distributor' },
//   { value: 'supplier', label: 'Supplier' },
// ];

// const FIELDS = [
//   { key: 'name', label: 'Full name', icon: '👤', placeholder: 'Nil' },
//   { key: 'mobile', label: 'Mobile number', icon: '📞', readOnly: true },
//   { key: 'userType', label: 'User type', icon: '🧑‍🌾', placeholder: 'Nil', isSelect: true },
//   { key: 'email', label: 'Email', icon: '✉️', placeholder: 'Nil' },
//   { key: 'address', label: 'Address (optional)', icon: '📍', placeholder: 'Nil' },
// ];

// const Profile = () => {
//   const { user } = useSelector((state) => state.auth);
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const fileInputRef = useRef(null);

//   const [editingField, setEditingField] = useState(null);
//   const [draft, setDraft] = useState('');
//   const [saving, setSaving] = useState(false);

//   if (!user) return null;

//   const startEdit = (field) => {
//     if (field.readOnly) return;
//     setEditingField(field.key);
//     setDraft(user[field.key] || '');
//   };

//   const cancelEdit = () => {
//     setEditingField(null);
//     setDraft('');
//   };

//   const saveEdit = async () => {
//     setSaving(true);
//     const fd = new FormData();
//     fd.append(editingField, draft);
//     const result = await dispatch(updateProfile(fd));
//     setSaving(false);
//     if (updateProfile.fulfilled.match(result)) {
//       cancelEdit();
//     }
//   };

//   const handlePhotoChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     const fd = new FormData();
//     fd.append('photo', file);
//     await dispatch(updateProfile(fd));
//   };

//   const handleLogout = () => {
//     dispatch(logout());
//     navigate('/login', { replace: true });
//   };

//   const initial = (user.name || user.mobile || '?').charAt(0).toUpperCase();

//   return (
//     <div className="oh-mobile-shell">
//       <div className="oh-mobile-content">
//         <div className="oh-profile-card">
//           <div className="oh-avatar-wrap">
//             <div className="oh-avatar">
//               {user.photoUrl ? <img src={user.photoUrl} alt={user.name || 'Profile'} /> : initial}
//               <div className="oh-avatar-cam" onClick={() => fileInputRef.current?.click()}>
//                 📷
//               </div>
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 accept="image/*"
//                 style={{ display: 'none' }}
//                 onChange={handlePhotoChange}
//               />
//             </div>
//             <div className="oh-profile-name">{user.name || 'Nil'}</div>
//             <div className="oh-profile-mobile">+91 {user.mobile}</div>
//             {user.userType && <span className={`oh-badge ${user.userType}`}>{user.userType}</span>}
//           </div>

//           <div className="oh-section-label">Account details — tap a row to edit</div>

//           {FIELDS.map((field) => {
//             const value = field.key === 'mobile' ? `+91 ${user.mobile}` : user[field.key];
//             return (
//               <div key={field.key}>
//                 <div className="oh-detail-row" onClick={() => startEdit(field)}>
//                   <div className="oh-detail-left">
//                     <div className="oh-detail-icon">{field.icon}</div>
//                     <div style={{ minWidth: 0 }}>
//                       <div className="oh-detail-label">{field.label}</div>
//                       <div className={`oh-detail-value ${!value ? 'empty' : ''}`}>
//                         {value || field.placeholder || 'Nil'}
//                       </div>
//                     </div>
//                   </div>
//                   {!field.readOnly && <span style={{ color: 'var(--oh-ink)' }}>✎</span>}
//                 </div>

//                 {editingField === field.key && (
//                   <div className="oh-edit-inline">
//                     <label>Edit {field.label.toLowerCase()}</label>
//                     {field.isSelect ? (
//                       <select value={draft} onChange={(e) => setDraft(e.target.value)}>
//                         <option value="">Select category</option>
//                         {USER_TYPES.map((t) => (
//                           <option key={t.value} value={t.value}>
//                             {t.label}
//                           </option>
//                         ))}
//                       </select>
//                     ) : (
//                       <input
//                         type={field.key === 'email' ? 'email' : 'text'}
//                         value={draft}
//                         onChange={(e) => setDraft(e.target.value)}
//                         autoFocus
//                       />
//                     )}
//                     <div className="oh-edit-actions">
//                       <button className="oh-btn-cancel" onClick={cancelEdit} type="button">
//                         Cancel
//                       </button>
//                       <button className="oh-btn-save" onClick={saveEdit} type="button" disabled={saving}>
//                         {saving ? 'Saving…' : 'Save'}
//                       </button>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             );
//           })}

//           <div className="oh-logout-row">
//             <button className="oh-btn-logout" onClick={handleLogout} type="button">
//               Log out
//             </button>
//           </div>
//         </div>
//       </div>
//       <BottomNav />
//     </div>
//   );
// };

// export default Profile;

import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AtSign, Camera, LogOut, Mail, MapPin, Pencil, Phone, UserRound, UsersRound } from "lucide-react";
import { updateProfile, logout } from "../store/authSlice";
import connectApi from "../connect/api";
import { Spinner } from "../components/Loader.jsx";
import { userCode } from "../utils/format";
import "../styles/app-shell.css";

const USER_TYPES = [
  { value: "farmer", label: "Farmer" },
  { value: "retailer", label: "Retailer" },
  { value: "distributor", label: "Distributor" },
  { value: "supplier", label: "Supplier" },
];

const TYPE_LABELS = { ...Object.fromEntries(USER_TYPES.map((t) => [t.value, t.label])), consumer: "Consumer" };
// What anyone can pick for themselves: retailer and distributor are supply-chain roles that only
// OriginHash (or, for retailers, "Become a retailer") gives.
const SELF_TYPES = [
  { value: "consumer", label: "Consumer" },
  { value: "farmer", label: "Farmer" },
  { value: "supplier", label: "Supplier" },
];

// Producer users (admin and staff) sign in with a username, have no editable user type (their role
// comes from their producer), and fall back to the company's address. Distributors' and retailers'
// user type is their supply-chain role, set by OriginHash.
const fieldsFor = (isProducer, isPartner) => [
  { key: "name", label: "Full name", Icon: UserRound, placeholder: "Nil" },
  ...(isProducer ? [{ key: "username", label: "Username", Icon: AtSign, readOnly: true, lock: "Sign-in" }] : []),
  { key: "mobile", label: "Mobile number", Icon: Phone, readOnly: true, lock: isProducer ? "Set by admin" : "Sign-in" },
  {
    key: "userType",
    label: "User type",
    Icon: UsersRound,
    placeholder: "Nil",
    isSelect: true,
    ...(isProducer ? { readOnly: true, lock: "Set by admin" } : isPartner ? { readOnly: true, lock: "Set by OriginHash" } : {}),
  },
  { key: "email", label: "Email", Icon: Mail, placeholder: "Nil" },
  {
    key: "address",
    label: isProducer ? "Address" : "Address (optional)",
    Icon: MapPin,
    placeholder: "Nil",
  },
];

const producerRoleLabel = (user) =>
  user.producerRole === "admin" ? "Producer admin" : user.producerRole === "staff" ? "Producer staff" : null;

// The signed-in user's own account: photo, details (edited one at a time, each saved on its
// own), and Log out. Unfilled details read "Nil".
const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [editingField, setEditingField] = useState(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [producer, setProducer] = useState(null);

  const producerId = user?.producerId;
  useEffect(() => {
    if (!producerId) return undefined;
    let live = true;
    connectApi
      .get("/producer/me")
      .then(({ data }) => live && setProducer(data.producer || null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [producerId]);

  if (!user) return null;

  const isProducer = Boolean(user.producerId);
  const isPartner = Boolean(user.partnerRole);
  const fields = fieldsFor(isProducer, isPartner);
  const roleLabel = producerRoleLabel(user);
  const partnerLabel =
    user.partnerRole === "distributor" ? "Distributor" : user.partnerRole === "retailer" ? (user.partnerProducerId ? "Retailer" : "General retailer") : null;
  // A self-chosen "retailer" / "distributor" from before is not a supply-chain role.
  const selfType = ["retailer", "distributor"].includes(user.userType) ? null : user.userType;
  const typeText = roleLabel
    ? [roleLabel, producer?.name].filter(Boolean).join(" · ")
    : partnerLabel || TYPE_LABELS[selfType] || selfType;

  const valueOf = (key) => {
    if (key === "mobile") return user.mobile ? `+91 ${user.mobile}` : "";
    if (key === "userType") return typeText;
    if (key === "address") return user.address || (isProducer ? producer?.address : "") || "";
    return user[key];
  };

  const startEdit = (field) => {
    if (field.readOnly) return;
    setSaveError("");
    setEditingField(field.key);
    setDraft(field.key === "userType" ? selfType || "" : valueOf(field.key) || "");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setDraft("");
    setSaveError("");
  };

  const saveEdit = async () => {
    setSaving(true);
    setSaveError("");
    const fd = new FormData();
    fd.append(editingField, draft);
    const result = await dispatch(updateProfile(fd));
    setSaving(false);
    if (updateProfile.fulfilled.match(result)) {
      cancelEdit();
    } else {
      setSaveError(result.payload || "Could not update profile.");
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    setPhotoError("");
    setPhotoSaving(true);
    const fd = new FormData();
    fd.append("photo", file);
    const result = await dispatch(updateProfile(fd));
    setPhotoSaving(false);

    if (updateProfile.rejected.match(result)) {
      setPhotoError(result.payload || "Could not update profile photo.");
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const initial = (user.name || user.mobile || "?").charAt(0).toUpperCase();

  return (
    <div className="oh-account">
      <header className="oh-admin-header">
        <div>
          <span className="oh-eyebrow">Account</span>
          <h1 className="oh-admin-title">My profile</h1>
          <p className="oh-admin-subtitle">Your details appear on the scans and batches you create.</p>
        </div>
      </header>

      <div className="oh-account-grid">
        <section className="oh-account-card oh-account-identity" aria-label="Profile photo and name">
          <div className="oh-account-avatar">
            {user.photoUrl ? <img src={user.photoUrl} alt={user.name || "Profile"} /> : <span>{initial}</span>}
            <button
              type="button"
              className="oh-account-photo-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile photo"
              title="Change profile photo"
              disabled={photoSaving}
            >
              {photoSaving ? <Spinner className="solo" /> : <Camera size={16} strokeWidth={1.75} aria-hidden="true" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
          </div>
          <div className="oh-account-name">{user.name || "Nil"}</div>
          <div className="oh-account-sub">
            {user.mobile ? `+91 ${user.mobile}` : user.username ? `@${user.username}` : ""}
          </div>
          <div className="oh-account-stamps">
            <span className="oh-user-code">{userCode(user.id)}</span>
            {roleLabel || partnerLabel ? (
              <span className={`oh-badge ${user.partnerRole || ''}`}>{roleLabel || partnerLabel}</span>
            ) : (
              selfType && <span className={`oh-badge ${selfType}`}>{typeText}</span>
            )}
          </div>
          {photoError && (
            <div className="oh-error" role="alert">
              {photoError}
            </div>
          )}
          <button className="oh-account-logout" onClick={handleLogout} type="button">
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            Log out
          </button>
        </section>

        <section className="oh-account-card" aria-labelledby="oh-account-details">
          <div className="oh-account-card-head">
            <h2 id="oh-account-details">Account details</h2>
            <p>
              {isProducer
                ? "Edit one detail at a time. You sign in with your username; your admin manages your mobile and role."
                : "Edit one detail at a time. Your mobile number is your sign-in and can’t be changed here."}
            </p>
          </div>

          <dl className="oh-account-list">
            {fields.map((field) => {
              const value = valueOf(field.key);
              const editing = editingField === field.key;
              return (
                <div key={field.key} className={`oh-account-row ${editing ? "editing" : ""}`}>
                  <dt>
                    <field.Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                    {field.label}
                  </dt>
                  {editing ? (
                    <dd className="oh-edit-inline">
                      <label htmlFor={`oh-profile-${field.key}`} className="oh-sr-only">
                        Edit {field.label.toLowerCase()}
                      </label>
                      {field.isSelect ? (
                        <select id={`oh-profile-${field.key}`} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus>
                          <option value="">Select category</option>
                          {SELF_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {field.isSelect ? (
                        <p className="oh-account-sub" style={{ margin: "6px 0 0", textAlign: "left" }}>
                          Retailer or distributor? Those accounts are set up by OriginHash — retailers can register from the menu (“Become a retailer”).
                        </p>
                      ) : (
                        <input
                          id={`oh-profile-${field.key}`}
                          type={field.key === "email" ? "email" : "text"}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                        />
                      )}
                      {saveError && (
                        <div className="oh-field-alert" role="alert">
                          {saveError}
                        </div>
                      )}
                      <div className="oh-edit-actions">
                        <button className="oh-btn-cancel" onClick={cancelEdit} type="button">
                          Cancel
                        </button>
                        <button className="oh-btn-save" onClick={saveEdit} type="button" disabled={saving}>
                          {saving ? (
                            <>
                              <Spinner />
                              Saving…
                            </>
                          ) : (
                            "Save"
                          )}
                        </button>
                      </div>
                    </dd>
                  ) : (
                    <dd>
                      <span className={`oh-account-value ${!value ? "empty" : ""}`}>{value || field.placeholder || "Nil"}</span>
                      {field.readOnly ? (
                        <span className="oh-account-locked">{field.lock || "Sign-in"}</span>
                      ) : (
                        <button type="button" className="oh-account-edit" onClick={() => startEdit(field)}>
                          <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
                          Edit<span className="oh-sr-only"> {field.label.toLowerCase()}</span>
                        </button>
                      )}
                    </dd>
                  )}
                </div>
              );
            })}
          </dl>
        </section>
      </div>
    </div>
  );
};

export default Profile;
