import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Maximize2,
  RefreshCw,
  FolderOpen,
  FolderMinus,
  FileCode,
  FileImage,
} from 'lucide-react';

export interface MindMapItem {
  id: string;
  title?: string;
  label?: string;
  children?: MindMapItem[];
  collapsed?: boolean;
}

interface MindMapViewerProps {
  node: any;
  onUpdateMindMap?: (updated: any) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

// Helper to normalize any mindmap shape to standard root item
function normalizeRootNode(raw: any, lang: 'vi' | 'en' = 'vi'): MindMapItem {
  if (!raw) return { id: 'root', title: lang === 'vi' ? 'Chủ đề chính' : 'Main Topic', children: [] };
  if (Array.isArray(raw.nodes) && raw.nodes.length > 0) {
    return normalizeSubNode(raw.nodes[0], 'root', lang);
  }
  return normalizeSubNode(raw, 'root', lang);
}

function normalizeSubNode(n: any, defaultId: string, lang: 'vi' | 'en' = 'vi'): MindMapItem {
  if (!n) return { id: defaultId, title: lang === 'vi' ? 'Nội dung' : 'Content', children: [] };
  const id = n.id || defaultId;
  const title = n.title || n.label || (lang === 'vi' ? 'Ý chính' : 'Key Point');
  const rawChildren = Array.isArray(n.children)
    ? n.children
    : Array.isArray(n.nodes)
    ? n.nodes
    : [];

  return {
    id,
    title,
    label: title,
    collapsed: false,
    children: rawChildren.map((c: any, idx: number) =>
      normalizeSubNode(c, `${id}-${idx + 1}`, lang)
    ),
  };
}

export const MindMapViewer: React.FC<MindMapViewerProps> = ({
  node,
  onUpdateMindMap,
  onRegenerate,
  isRegenerating = false,
}) => {
  const { language, showToast } = useApp();
  const [treeData, setTreeData] = useState<MindMapItem>(() => normalizeRootNode(node, language));
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLDivElement>(null);

  // Synchronize when prop node updates
  useEffect(() => {
    if (node) {
      setTreeData(normalizeRootNode(node, language));
    }
  }, [node, language]);

  // Pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicking the canvas background, not on interactive nodes
    if ((e.target as HTMLElement).closest('.interactive-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Node editing helpers
  const updateNodeInTree = (
    root: MindMapItem,
    targetId: string,
    transform: (n: MindMapItem) => MindMapItem | null
  ): MindMapItem | null => {
    if (root.id === targetId) {
      return transform(root);
    }
    if (!root.children || root.children.length === 0) {
      return root;
    }
    const nextChildren: MindMapItem[] = [];
    for (const child of root.children) {
      const updated = updateNodeInTree(child, targetId, transform);
      if (updated !== null) {
        nextChildren.push(updated);
      }
    }
    return { ...root, children: nextChildren };
  };

  const handleSaveEdit = (targetId: string) => {
    if (!editValue.trim()) {
      setEditingNodeId(null);
      return;
    }
    const updated = updateNodeInTree(treeData, targetId, (n) => ({
      ...n,
      title: editValue.trim(),
      label: editValue.trim(),
    }));
    if (updated) {
      setTreeData(updated);
      if (onUpdateMindMap) onUpdateMindMap(updated);
    }
    setEditingNodeId(null);
  };

  const handleDeleteNode = (targetId: string) => {
    if (targetId === treeData.id) {
      showToast(
        language === 'vi' ? 'Không thể xóa nút gốc trung tâm.' : 'Cannot delete the root node.',
        'warning'
      );
      return;
    }
    const updated = updateNodeInTree(treeData, targetId, () => null);
    if (updated) {
      setTreeData(updated);
      if (onUpdateMindMap) onUpdateMindMap(updated);
    }
  };

  const handleAddChild = (parentId: string) => {
    const newId = `${parentId}-${Date.now().toString().slice(-4)}`;
    const defaultLabel = language === 'vi' ? 'Ý mới' : 'New Node';
    const updated = updateNodeInTree(treeData, parentId, (n) => ({
      ...n,
      children: [
        ...(n.children || []),
        { id: newId, title: defaultLabel, label: defaultLabel, children: [], collapsed: false },
      ],
    }));
    if (updated) {
      setTreeData(updated);
      if (onUpdateMindMap) onUpdateMindMap(updated);
    }
  };

  const handleToggleCollapse = (targetId: string) => {
    const updated = updateNodeInTree(treeData, targetId, (n) => ({
      ...n,
      collapsed: !n.collapsed,
    }));
    if (updated) {
      setTreeData(updated);
    }
  };

  const setAllCollapseState = (collapse: boolean) => {
    const recurse = (n: MindMapItem): MindMapItem => ({
      ...n,
      collapsed: collapse,
      children: n.children ? n.children.map(recurse) : [],
    });
    setTreeData(recurse(treeData));
  };

  // Export mind map as JSON
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(treeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-${treeData.title || 'studymind'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  // Export mind map as SVG
  const handleExportSvg = () => {
    if (!mapCanvasRef.current) return;
    const content = mapCanvasRef.current.innerHTML;
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: sans-serif; padding: 20px; background: white;">
          ${content}
        </div>
      </foreignObject>
    </svg>`;
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-${treeData.title || 'studymind'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  // Render a recursive tree node
  const renderTreeNode = (n: MindMapItem, level: number = 0) => {
    const isRoot = level === 0;
    const hasChildren = Array.isArray(n.children) && n.children.length > 0;
    const isEditing = editingNodeId === n.id;
    const isCollapsed = !!n.collapsed;

    // Distinct hierarchy styling
    const levelStyles = [
      'bg-indigo-600 text-white shadow-lg border-indigo-700 ring-2 ring-indigo-500/20 text-sm font-bold',
      'bg-purple-50 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800 shadow-sm font-semibold text-xs',
      'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800 font-medium text-xs',
      'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800 text-xs',
      'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 text-xs',
    ];
    const styleClass = levelStyles[Math.min(level, levelStyles.length - 1)];

    return (
      <div key={n.id} className="flex items-start gap-4 my-2.5">
        <div
          className={`interactive-node group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all duration-150 select-none ${styleClass} hover:shadow-md`}
        >
          {/* Collapse/Expand indicator */}
          {hasChildren && (
            <button
              onClick={() => handleToggleCollapse(n.id)}
              className="p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title={
                isCollapsed
                  ? language === 'vi'
                    ? 'Mở rộng nhánh'
                    : 'Expand branch'
                  : language === 'vi'
                  ? 'Thu gọn nhánh'
                  : 'Collapse branch'
              }
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Node Title / Inline Editor */}
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit(n.id);
                  if (e.key === 'Escape') setEditingNodeId(null);
                }}
                autoFocus
                className="px-2 py-0.5 rounded bg-white text-slate-900 text-xs border border-indigo-400 outline-none min-w-[120px]"
              />
              <button
                onClick={() => handleSaveEdit(n.id)}
                className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-600"
                title={language === 'vi' ? 'Lưu' : 'Save'}
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => setEditingNodeId(null)}
                className="p-1 rounded bg-slate-300 text-slate-700 hover:bg-slate-400"
                title={language === 'vi' ? 'Hủy' : 'Cancel'}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span
              onDoubleClick={() => {
                setEditingNodeId(n.id);
                setEditValue(n.title || n.label || '');
              }}
              className="cursor-default"
              title={language === 'vi' ? 'Nháy đúp chuột để sửa nội dung' : 'Double-click to edit'}
            >
              {n.title || n.label || (language === 'vi' ? 'Ý chính' : 'Key Point')}
            </span>
          )}

          {/* Node Action Tools (Hover) */}
          {!isEditing && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 pl-1 border-l border-current/20 flex items-center gap-1">
              <button
                onClick={() => {
                  setEditingNodeId(n.id);
                  setEditValue(n.title || n.label || '');
                }}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                title={language === 'vi' ? 'Sửa nội dung' : 'Edit node'}
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleAddChild(n.id)}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                title={language === 'vi' ? 'Thêm ý con' : 'Add child node'}
              >
                <Plus className="w-3 h-3" />
              </button>
              {!isRoot && (
                <button
                  onClick={() => handleDeleteNode(n.id)}
                  className="p-1 rounded hover:bg-rose-500/20 text-rose-500 hover:text-rose-600"
                  title={language === 'vi' ? 'Xóa ý này' : 'Delete node'}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Child branches */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col border-l-2 border-indigo-200 dark:border-indigo-800/60 pl-4 space-y-1 relative before:absolute before:left-0 before:top-4 before:w-3 before:h-0.5 before:bg-indigo-200 dark:before:bg-indigo-800/60">
            {n.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden relative shadow-xs"
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-white dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 z-10 backdrop-blur-xs gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'vi' ? 'Sơ đồ tư duy AI' : 'AI Mind Map'}</span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {language === 'vi' ? 'Tương tác cao cấp' : 'Interactive'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              {language === 'vi'
                ? 'Nháy đúp chuột vào chữ để sửa • Kéo chuột để di chuyển • Nhấn + để thêm nhánh'
                : 'Double-click text to edit • Drag canvas to pan • Click + to add branch'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Zoom In / Out / Reset */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">
            <button
              onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(1))))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              title={language === 'vi' ? 'Thu nhỏ' : 'Zoom out'}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono px-2 text-slate-600 dark:text-slate-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.0, Number((s + 0.1).toFixed(1))))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              title={language === 'vi' ? 'Phóng to' : 'Zoom in'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setScale(1);
                setPan({ x: 20, y: 20 });
              }}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-l border-slate-200 dark:border-slate-700"
              title={language === 'vi' ? 'Đặt lại góc nhìn (Reset 100%)' : 'Reset view (100%)'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Expand/Collapse All */}
          <button
            onClick={() => setAllCollapseState(false)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
            title={language === 'vi' ? 'Mở rộng tất cả các nhánh' : 'Expand all branches'}
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">{language === 'vi' ? 'Mở rộng hết' : 'Expand All'}</span>
          </button>
          <button
            onClick={() => setAllCollapseState(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
            title={language === 'vi' ? 'Thu gọn tất cả các nhánh' : 'Collapse all branches'}
          >
            <FolderMinus className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">{language === 'vi' ? 'Thu gọn' : 'Collapse'}</span>
          </button>

          {/* Regenerate with AI */}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title={language === 'vi' ? 'Tạo lại sơ đồ tư duy bằng AI' : 'Regenerate mind map with AI'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>
                {isRegenerating
                  ? language === 'vi'
                    ? 'Đang tạo...'
                    : 'Generating...'
                  : language === 'vi'
                  ? 'Tạo lại AI'
                  : 'Regenerate AI'}
              </span>
            </button>
          )}

          {/* Download Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Tải về' : 'Export'}</span>
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-30">
                <button
                  onClick={handleExportSvg}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <FileImage className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{language === 'vi' ? 'Ảnh vector (SVG)' : 'Vector Image (SVG)'}</span>
                </button>
                <button
                  onClick={handleExportJson}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{language === 'vi' ? 'Dữ liệu sơ đồ (JSON)' : 'Mind Map Data (JSON)'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Infinite Pan Canvas Area */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full min-h-[520px] max-h-[720px] overflow-hidden relative cursor-grab active:cursor-grabbing p-6 ${
          isDragging ? 'select-none' : ''
        }`}
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(99, 102, 241, 0.12) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          ref={mapCanvasRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="inline-block"
        >
          {renderTreeNode(treeData, 0)}
        </div>
      </div>
    </div>
  );
};
