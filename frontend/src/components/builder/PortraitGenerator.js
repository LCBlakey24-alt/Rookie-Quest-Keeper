import React from "react";
import { toast } from "sonner";
import { RefreshCw, Upload, Image as ImageIcon } from "lucide-react";

const theme = {
  red: "#EF4444",
  text: { primary: "#FFFFFF", secondary: "#D1D5DB", muted: "#9CA3AF" },
  border: "rgba(239, 68, 68, 0.35)",
  bg: { primary: "#1F1F23", surface: "#27272B" }
};

export default function PortraitGenerator({ portrait = "", onChange }) {
  const fileInputRef = React.useRef(null);

  const onUploadFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      e.target.value = "";
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image too large (max 4MB). Please resize or pick a smaller file.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange?.(reader.result);
      toast.success("Portrait uploaded");
    };
    reader.onerror = () => toast.error("Failed to read image");
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div
      data-testid="portrait-generator"
      style={{
        padding: 16,
        borderRadius: 0,
        background: "rgba(39, 39, 43, 0.86)",
        border: `1px solid ${theme.border}`,
        marginBottom: 20
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <ImageIcon size={15} color={theme.red} />
        <div style={{ fontSize: 12, fontWeight: 800, color: theme.red, letterSpacing: 1 }}>
          CHARACTER PORTRAIT
        </div>
        <span style={{ fontSize: 10, color: theme.text.muted, fontStyle: "italic" }}>
          optional — upload your own or continue without one
        </span>
      </div>

      <div style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 1.55, marginBottom: 12 }}>
        AI image generation is disabled for now to keep site costs under control. You can still upload a portrait, or create the character without one and add it later.
      </div>

      <label
        htmlFor="portrait-file-upload"
        data-testid="portrait-upload-label"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "transparent",
          border: `1px solid ${theme.border}`,
          borderRadius: 0,
          color: theme.text.secondary,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          marginBottom: portrait ? 12 : 0
        }}
      >
        <Upload size={13} /> Upload your own
        <input
          id="portrait-file-upload"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onUploadFile}
          data-testid="portrait-file-input"
          style={{ display: "none" }}
        />
      </label>

      {portrait && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: theme.text.secondary }}>
          <div style={{ width: 64, aspectRatio: "3 / 4", background: "#0B0B0C", border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
            <img
              src={portrait}
              alt="Character portrait preview"
              style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center top" }}
              onError={e => { e.currentTarget.style.display = "none"; }}
            />
          </div>
          <span>Current portrait chosen — will save with your character.</span>
          <button
            type="button"
            onClick={() => onChange?.("")}
            data-testid="clear-portrait-btn"
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: `1px solid ${theme.border}`,
              color: theme.text.muted,
              padding: "8px 10px",
              borderRadius: 0,
              fontSize: 11,
              cursor: "pointer"
            }}
          >
            <RefreshCw size={11} /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
