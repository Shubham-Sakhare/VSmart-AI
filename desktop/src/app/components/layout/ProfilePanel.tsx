import { useEffect, useRef, useState } from "react";
import {
  UserCircle2,
  Pencil,
  Link2,
  Globe,
  KeyRound,
  Check,
  X
} from "lucide-react";
import "./ProfilePanel.css";

const PROFILE_KEY = "vsmart_profile";

interface SocialLinks {
  github: string;
  twitter: string;
  linkedin: string;
  instagram: string;
  website: string;
}

interface ProfileData {
  photo: string | null;
  username: string;
  profession: string;
  email: string;
  socials: SocialLinks;
}

const DEFAULT_PROFILE: ProfileData = {
  photo: null,
  username: "Operator",
  profession: "",
  email: "",
  socials: { github: "", twitter: "", linkedin: "", instagram: "", website: "" }
};

function parseProfile(raw: unknown): ProfileData {
  if (typeof raw !== "string" || !raw) return DEFAULT_PROFILE;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      socials: { ...DEFAULT_PROFILE.socials, ...(parsed.socials || {}) }
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

interface SocialIconDef {
  key: keyof SocialLinks;
  Icon: typeof Link2;
  label: string;
}

const SOCIAL_ICONS: SocialIconDef[] = [
  { key: "github", Icon: Link2, label: "GitHub" },
  { key: "twitter", Icon: Link2, label: "Twitter / X" },
  { key: "linkedin", Icon: Link2, label: "LinkedIn" },
  { key: "instagram", Icon: Link2, label: "Instagram" },
  { key: "website", Icon: Globe, label: "Website" }
];

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [editing, setEditing] = useState(false);
  const [editingSocial, setEditingSocial] = useState<keyof SocialLinks | null>(null);
  const [socialDraft, setSocialDraft] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    window.vsmart
      .getMemory(PROFILE_KEY)
      .then((raw) => setProfile(parseProfile(raw)))
      .catch(() => setProfile(DEFAULT_PROFILE));
    window.vsmart.apiKey.has().then(setHasKey).catch(() => setHasKey(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, onClose]);

  const persist = (next: ProfileData) => {
    setProfile(next);
    window.vsmart.saveMemory(PROFILE_KEY, JSON.stringify(next)).catch(() => {});
  };

  if (!open) return null;

  const handlePickPhoto = async () => {
    try {
      const dataUrl = await window.vsmart.launcher.pickImage();
      if (dataUrl) persist({ ...profile, photo: dataUrl });
    } catch {
      /* no-op */
    }
  };

  const handleFieldChange = (field: "username" | "profession" | "email", value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveFields = () => {
    persist(profile);
    setEditing(false);
  };

  const startEditSocial = (key: keyof SocialLinks) => {
    setEditingSocial(key);
    setSocialDraft(profile.socials[key]);
  };

  const saveSocial = () => {
    if (!editingSocial) return;
    const next = {
      ...profile,
      socials: { ...profile.socials, [editingSocial]: socialDraft.trim() }
    };
    persist(next);
    setEditingSocial(null);
  };

  const openSocial = (key: keyof SocialLinks) => {
    const url = profile.socials[key];
    if (!url) {
      startEditSocial(key);
      return;
    }
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    window.vsmart.openExternal(normalized).catch(() => {});
  };

  return (
    <div className="profile-panel" ref={panelRef}>
      <div className="profile-panel-header">
        <div className="profile-photo-wrap" onClick={handlePickPhoto} title="Change photo">
          {profile.photo ? (
            <img src={profile.photo} className="profile-photo" />
          ) : (
            <UserCircle2 size={56} className="profile-photo-fallback" />
          )}
          <div className="profile-photo-edit">
            <Pencil size={12} />
          </div>
        </div>

        {editing ? (
          <div className="profile-edit-fields">
            <input
              className="profile-input"
              placeholder="Username"
              value={profile.username}
              onChange={(e) => handleFieldChange("username", e.target.value)}
            />
            <input
              className="profile-input"
              placeholder="Profession"
              value={profile.profession}
              onChange={(e) => handleFieldChange("profession", e.target.value)}
            />
            <input
              className="profile-input"
              placeholder="Email"
              value={profile.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
            />
            <button className="profile-save-btn" onClick={handleSaveFields}>
              <Check size={13} /> Save
            </button>
          </div>
        ) : (
          <div className="profile-info" onClick={() => setEditing(true)} title="Click to edit">
            <div className="profile-name-row">
              <strong>{profile.username || "Operator"}</strong>
              <Pencil size={11} className="profile-inline-edit-icon" />
            </div>
            {profile.profession && <span className="profile-sub">{profile.profession}</span>}
            {profile.email && <span className="profile-sub">{profile.email}</span>}
          </div>
        )}
      </div>

      <div className="profile-socials">
        {SOCIAL_ICONS.map(({ key, Icon, label }) => {
          const hasUrl = Boolean(profile.socials[key]);
          const isEditingThis = editingSocial === key;
          return (
            <div className="profile-social-item" key={key}>
              {isEditingThis ? (
                <div className="profile-social-edit">
                  <input
                    className="profile-input small"
                    placeholder={`${label} URL`}
                    autoFocus
                    value={socialDraft}
                    onChange={(e) => setSocialDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveSocial()}
                  />
                  <button className="profile-icon-action" onClick={saveSocial}>
                    <Check size={12} />
                  </button>
                  <button className="profile-icon-action" onClick={() => setEditingSocial(null)}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  className={hasUrl ? "profile-social-btn active" : "profile-social-btn"}
                  title={hasUrl ? profile.socials[key] : `Add ${label}`}
                  onClick={() => openSocial(key)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    startEditSocial(key);
                  }}
                >
                  <Icon size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="profile-divider" />

      <div className="profile-api-status">
        <KeyRound size={14} />
        <span>API Key</span>
        <span className={hasKey ? "profile-status-badge on" : "profile-status-badge off"}>
          {hasKey ? "Connected" : "Not connected"}
        </span>
      </div>
    </div>
  );
}