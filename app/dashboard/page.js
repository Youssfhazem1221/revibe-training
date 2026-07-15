'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAllMaterials, deleteMaterial } from '@/lib/materials';
import { getUserProgress } from '@/lib/progress';
import Navbar from '@/components/Navbar';
import UploadZone from '@/components/UploadZone';
import ProgressBar from '@/components/ProgressBar';
import './dashboard.css';

export default function Dashboard() {
  const { user, isTrainer, loading } = useAuth();
  const router = useRouter();
  
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState(['All', 'General', 'Onboarding', 'Technical']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [userProgressMap, setUserProgressMap] = useState({});

  const filteredMaterials = useMemo(() => {
    let filtered = materials;
    if (activeCategory !== 'All') {
      filtered = filtered.filter(m => m.category === activeCategory);
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(q) || 
        (m.textContent && m.textContent.some(page => page.text.toLowerCase().includes(q)))
      );
    }
    return filtered;
  }, [materials, activeCategory, searchQuery]);

  const loadMaterials = useCallback(async () => {
    setIsLoadingMaterials(true);
    try {
      const data = await getAllMaterials();
      setMaterials(data);
      
      // Extract dynamic categories
      const uniqueCats = new Set(['All', 'General', 'Onboarding', 'Technical']);
      data.forEach(m => { if (m.category) uniqueCats.add(m.category); });
      setCategories(Array.from(uniqueCats));
    } catch (error) {
      console.error("Failed to load materials", error);
    }
    setIsLoadingMaterials(false);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      const id = requestAnimationFrame(() => {
        loadMaterials();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [user, loadMaterials]);

  // Load user progress data
  useEffect(() => {
    if (user) {
      getUserProgress(user.uid)
        .then(progressList => {
          const progressMap = {};
          progressList.forEach(progress => {
            progressMap[progress.materialId] = {
              viewedPages: progress.viewedPages?.length || 0,
              totalPages: progress.totalPages || 0,
              completionPercentage: progress.completionPercentage || 0,
              completed: progress.completed || false
            };
          });
          setUserProgressMap(progressMap);
        })
        .catch(error => {
          console.error('Error loading user progress:', error);
        });
    }
  }, [user]);

  const handleDelete = async (id, storagePath) => {
    if (confirm('Are you sure you want to delete this material?')) {
      try {
        await deleteMaterial(id, storagePath);
        setMaterials(materials.filter(m => m.id !== id));
      } catch (error) {
        console.error("Failed to delete", error);
        alert('Failed to delete material');
      }
    }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-white)' }}>
      <i className="material-icons animate-spin" style={{ fontSize: '48px', color: 'var(--accent-pink)' }}>refresh</i>
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg-white">
      <Navbar title="Dashboard" />

      {isTrainer && (
        <section className="hero-stats">
          <div className="hero-stats-inner">
            <h1 className="hero-stats-greeting">Welcome back, Trainer 👋</h1>
            <p className="hero-stats-subtitle">Manage your training materials and oversee the knowledge base.</p>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{materials.length}</div>
                <div className="stat-label">Total Materials</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{categories.length - 1}</div>
                <div className="stat-label">Categories</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="dashboard-content">
        {isTrainer && (
          <UploadZone onUploadComplete={(newMaterial) => setMaterials([newMaterial, ...materials])} />
        )}

        <div className="section-header">
          <h2 className="section-title">Training Materials</h2>
          <div className="search-bar">
            <i className="material-icons search-icon">search</i>
            <input 
              type="text" 
              placeholder="Search by name or content..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="category-pills">
          {categories.map(cat => (
            <button 
              key={cat}
              className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoadingMaterials ? (
          <div className="empty-state">
            <i className="material-icons animate-spin text-accent-pink" style={{ fontSize: '48px', marginBottom: '16px' }}>refresh</i>
            <p className="text-muted">Loading materials...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="empty-state">
            <i className="material-icons empty-state-icon">inventory_2</i>
            <h3 className="empty-state-title">No materials found</h3>
            <p className="empty-state-text">
              {isTrainer ? "Upload a PDF or PPTX to get started." : "Check back later for new training materials."}
            </p>
          </div>
        ) : (
          <div className="materials-grid">
            {filteredMaterials.map(material => (
              <div key={material.id} className="material-card">
                <div className="material-thumbnail">
                  {material.thumbnailURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={material.thumbnailURL} alt={material.name} />
                  ) : (
                    <div className="material-thumbnail-placeholder">
                      <i className="material-icons">
                        {material.fileName?.toLowerCase().endsWith('.pptx') ? 'co_present' : 'picture_as_pdf'}
                      </i>
                    </div>
                  )}
                  <div className="material-page-count">
                    {material.pageCount} {material.fileName?.toLowerCase().endsWith('.pptx') ? 'slides' : 'pages'}
                  </div>
                </div>
                <div className="material-info">
                  <h3 className="material-name" title={material.name}>{material.name}</h3>
                  <div className="material-meta">
                    <div className="material-meta-item">
                      <i className="material-icons">folder</i>
                      <span>{material.category}</span>
                    </div>
                    <div className="material-meta-item">
                      <i className="material-icons">schedule</i>
                      <span>{new Date(material.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {userProgressMap[material.id] && (
                    <div className="material-progress" style={{ marginTop: '12px', marginBottom: '8px' }}>
                      <ProgressBar
                        viewedPages={userProgressMap[material.id].viewedPages}
                        totalPages={userProgressMap[material.id].totalPages}
                        size="sm"
                        showLabel={true}
                      />
                    </div>
                  )}
                  
                  <div className="material-actions mt-auto">
                    <button 
                      className="btn btn-gradient btn-sm flex-1"
                      onClick={() => router.push(`/viewer?id=${material.id}`)}
                    >
                      <i className="material-icons" style={{fontSize: '16px'}}>visibility</i> View
                    </button>
                    
                    {isTrainer && (
                      <>
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={() => router.push(`/editor?id=${material.id}`)}
                          title="Experimental Editor"
                        >
                          <i className="material-icons" style={{fontSize: '16px'}}>edit</i>
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(material.id, material.storagePath)}
                          title="Delete"
                        >
                          <i className="material-icons" style={{fontSize: '16px'}}>delete</i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
