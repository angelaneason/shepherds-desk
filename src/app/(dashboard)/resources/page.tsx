'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Plus, Sparkles, Tag, Book, MoreVertical, Edit, Trash2, X, ChevronDown, ChevronUp, Phone, MapPin, Globe, Clock, Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Resource {
  id: string;
  profile_id: string;
  title: string;
  category: string;
  content: string;
  scripture_references: string[];
  tags: string[];
  phone: string | null;
  address: string | null;
  website: string | null;
  hours: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  // Pastoral Counseling
  { id: 'grief', label: 'Grief' },
  { id: 'marriage', label: 'Marriage' },
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'addiction', label: 'Addiction' },
  { id: 'depression', label: 'Depression' },
  { id: 'family', label: 'Family' },
  { id: 'faith_crisis', label: 'Faith Crisis' },
  { id: 'anger', label: 'Anger' },
  { id: 'forgiveness', label: 'Forgiveness' },
  { id: 'parenting', label: 'Parenting' },
  { id: 'finances', label: 'Finances' },
  { id: 'loneliness', label: 'Loneliness' },
  // Community / Local Resources
  { id: 'housing', label: '🏠 Housing' },
  { id: 'food_pantry', label: '🍞 Food Pantry' },
  { id: 'shelter', label: '🏘️ Shelter' },
  { id: 'crisis_hotline', label: '📞 Crisis Hotline' },
  { id: 'mental_health', label: '🧠 Mental Health' },
  { id: 'legal_aid', label: '⚖️ Legal Aid' },
  { id: 'medical', label: '🏥 Medical' },
  { id: 'community', label: '🤝 Community' },
  { id: 'other', label: 'Other' },
];

const COMMUNITY_CATEGORIES = ['housing', 'food_pantry', 'shelter', 'crisis_hotline', 'mental_health', 'legal_aid', 'medical', 'community'];

const STARTER_RESOURCES = [
  { title: 'Navigating the Loss of a Loved One', category: 'grief', content: 'Grief is a natural response to loss, and everyone processes it differently. As a pastor, it is crucial to offer a ministry of presence—simply being there without trying to fix their pain. Validate their feelings of sorrow and remind them that Jesus wept with Mary and Martha. Encourage them to lean into their faith, but do not rush their mourning process.', scripture_references: ['Psalm 34:18', 'Matthew 5:4', 'John 11:35'], tags: ['loss', 'comfort', 'mourning'] },
  { title: 'Finding Hope After Miscarriage', category: 'grief', content: 'The loss of an unborn child brings a unique and often silent grief. Acknowledge the life that was lost and the deep pain of unfulfilled hopes. Provide a safe space for parents to express anger, confusion, and sadness. Remind them of God\'s tender care for them and their little one.', scripture_references: ['Psalm 139:13-16', 'Isaiah 41:10', 'Revelation 21:4'], tags: ['miscarriage', 'family', 'hope'] },
  { title: 'Restoring Communication in Marriage', category: 'marriage', content: 'Communication breakdowns often stem from feeling unheard or unvalued. Encourage couples to practice active listening—seeking to understand before being understood. Advise them to use "I" statements to express their feelings without attacking their spouse. Remind them that a strong marriage requires grace, patience, and a willingness to forgive.', scripture_references: ['James 1:19', 'Ephesians 4:29', 'Proverbs 15:1'], tags: ['communication', 'conflict', 'grace'] },
  { title: 'Navigating Conflict and Forgiveness', category: 'marriage', content: 'Conflict is inevitable, but how it is handled determines the health of a marriage. Teach couples to fight fair by staying on topic and avoiding character assassination. Emphasize the importance of forgiveness, modeling the forgiveness they have received from Christ. Encourage them to pray together for unity and reconciliation.', scripture_references: ['Colossians 3:13', 'Ephesians 4:31-32', '1 Peter 4:8'], tags: ['forgiveness', 'conflict', 'unity'] },
  { title: 'Managing Worry and Anxiety', category: 'anxiety', content: 'Anxiety often arises from a desire to control the uncontrollable. Encourage individuals to bring their worries to God in prayer, trading their anxiety for His peace. Help them identify negative thought patterns and replace them with biblical truths. Remind them that God is sovereign and deeply cares for them.', scripture_references: ['Philippians 4:6-7', '1 Peter 5:7', 'Matthew 6:25-34'], tags: ['worry', 'peace', 'trust'] },
  { title: 'Overcoming Panic Attacks', category: 'anxiety', content: 'Panic attacks can be terrifying and disorienting. Provide practical grounding techniques, such as deep breathing or focusing on immediate surroundings. Remind them of God\'s constant presence and protection. Encourage them to seek medical advice if the panic attacks are severe or recurring.', scripture_references: ['Isaiah 41:10', 'Psalm 94:19', '2 Timothy 1:7'], tags: ['panic', 'fear', 'presence'] },
  { title: 'Breaking Free from Substance Abuse', category: 'addiction', content: 'Addiction is a complex struggle that affects the mind, body, and spirit. Offer grace and avoid judgment, recognizing the deep shame often associated with addiction. Encourage them to seek professional treatment and join a support group. Remind them that true freedom is found in Christ and that recovery is a journey.', scripture_references: ['1 Corinthians 10:13', 'Romans 6:14', 'Galatians 5:1'], tags: ['substance abuse', 'recovery', 'freedom'] },
  { title: 'Finding Light in the Darkness of Depression', category: 'depression', content: 'Depression can feel like an isolating and heavy blanket. Validate their pain and assure them they are not alone. Encourage them to maintain basic routines and seek professional help if needed. Remind them of God\'s nearness to the brokenhearted and the hope found in His promises.', scripture_references: ['Psalm 40:1-3', 'Psalm 42:11', 'Lamentations 3:22-24'], tags: ['despair', 'hope', 'support'] },
  { title: 'Healing Family Estrangement', category: 'family', content: 'Family rifts carry deep emotional wounds. Encourage individuals to seek reconciliation where possible, but acknowledge that boundaries may be necessary for safety and health. Pray for softened hearts and opportunities for dialogue. Remind them that God is the ultimate reconciler.', scripture_references: ['Romans 12:18', 'Matthew 18:15', '2 Corinthians 5:18'], tags: ['estrangement', 'reconciliation', 'boundaries'] },
  { title: 'Navigating Doubts and a Crisis of Faith', category: 'faith_crisis', content: 'Doubts are a normal part of the faith journey, not necessarily a sign of its end. Create a safe space for them to voice their questions without fear of condemnation. Encourage them to bring their doubts to God and explore them honestly. Remind them of the enduring truth of the Gospel.', scripture_references: ['Mark 9:24', 'Jude 1:22', 'Psalm 73'], tags: ['doubt', 'questions', 'truth'] },
  { title: 'Deconstruction and Rebuilding Faith', category: 'faith_crisis', content: 'When foundational beliefs are shaken, it can be disorienting. Guide them to differentiate between cultural Christianity and the core tenets of the faith. Encourage them to rebuild on the solid rock of Christ and His Word. Remind them that God can handle their hardest questions.', scripture_references: ['Matthew 7:24-25', 'Hebrews 11:1', 'John 6:68'], tags: ['deconstruction', 'foundation', 'truth'] },
  { title: 'Dealing with Righteous and Sinful Anger', category: 'anger', content: 'Anger is an emotion that can be either constructive or destructive. Help individuals distinguish between righteous anger at injustice and sinful anger rooted in pride or selfishness. Encourage them to process their anger constructively and seek reconciliation. Remind them to be slow to anger, reflecting God\'s character.', scripture_references: ['Ephesians 4:26-27', 'James 1:19-20', 'Proverbs 14:29'], tags: ['emotion', 'control', 'righteousness'] },
  { title: 'The Power of Forgiving Others', category: 'forgiveness', content: 'Forgiveness is often misunderstood as forgetting or excusing the wrong. Explain that forgiveness is choosing to release the offender from the debt they owe, trusting God with justice. Encourage them to process their pain and seek God\'s help in forgiving. Remind them that unforgiveness harms them more than the offender.', scripture_references: ['Matthew 6:14-15', 'Colossians 3:13', 'Luke 17:3-4'], tags: ['release', 'grace', 'healing'] },
  { title: 'Raising Children in a Complex World', category: 'parenting', content: 'Parenting brings immense joy and significant challenges. Encourage parents to disciple their children intentionally, modeling a vibrant faith. Advise them to balance grace and truth, setting clear boundaries with love. Remind them that their ultimate goal is to point their children to Christ.', scripture_references: ['Proverbs 22:6', 'Ephesians 6:4', 'Deuteronomy 6:6-7'], tags: ['children', 'discipleship', 'grace'] },
  { title: 'Finding Comfort in Loneliness', category: 'loneliness', content: 'Loneliness is a pervasive ache, even in a crowded room. Validate their feelings of isolation and encourage them to seek meaningful connections within the church community. Remind them that God sees them and that He is a friend who sticks closer than a brother.', scripture_references: ['Psalm 68:6', 'Hebrews 13:5', 'Proverbs 18:24'], tags: ['isolation', 'community', 'presence'] },
];

export default function ResourcesPage() {
  const supabase = createClient();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeSection, setActiveSection] = useState<'counseling' | 'community'>('counseling');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [content, setContent] = useState('');
  const [scriptures, setScriptures] = useState('');
  const [tags, setTags] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [hours, setHours] = useState('');

  // AI Counsel State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSituation, setAiSituation] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Expand states for cards
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data, error } = await supabase
        .from('counseling_resources')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false }) as any;
      
      if (!error && data) {
        setResources(data);
      }
    }
    setLoading(false);
  };

  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      // Section filter
      const isCommunity = COMMUNITY_CATEGORIES.includes(res.category);
      if (activeSection === 'counseling' && isCommunity) return false;
      if (activeSection === 'community' && !isCommunity) return false;

      const matchesCategory = selectedCategory === 'all' || res.category === selectedCategory;
      if (!matchesCategory) return false;
      
      if (searchQuery.trim() === '') return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = res.title.toLowerCase().includes(q);
      const matchContent = res.content.toLowerCase().includes(q);
      const matchScriptures = res.scripture_references?.some(s => s.toLowerCase().includes(q));
      const matchTags = res.tags?.some(t => t.toLowerCase().includes(q));
      const matchPhone = (res.phone || '').toLowerCase().includes(q);
      const matchAddress = (res.address || '').toLowerCase().includes(q);
      const matchWebsite = (res.website || '').toLowerCase().includes(q);
      return matchTitle || matchContent || matchScriptures || matchTags || matchPhone || matchAddress || matchWebsite;
    });
  }, [resources, searchQuery, selectedCategory, activeSection]);

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenModal = (resource?: Resource) => {
    if (resource) {
      setEditingResource(resource);
      setTitle(resource.title);
      setCategory(resource.category);
      setContent(resource.content);
      setScriptures((resource.scripture_references || []).join(', '));
      setTags((resource.tags || []).join(', '));
      setPhone(resource.phone || '');
      setAddress(resource.address || '');
      setWebsite(resource.website || '');
      setHours(resource.hours || '');
    } else {
      setEditingResource(null);
      setTitle('');
      setCategory('grief');
      setContent('');
      setScriptures('');
      setTags('');
      setPhone('');
      setAddress('');
      setWebsite('');
      setHours('');
    }
    setIsModalOpen(true);
  };

  const handleSaveResource = async () => {
    if (!userId) return;
    
    const formattedScriptures = scriptures.split(',').map(s => s.trim()).filter(Boolean);
    const formattedTags = tags.split(',').map(t => t.trim()).filter(Boolean);

    const payload = {
      profile_id: userId,
      title,
      category,
      content,
      scripture_references: formattedScriptures,
      tags: formattedTags,
      phone: phone || null,
      address: address || null,
      website: website || null,
      hours: hours || null,
    };

    if (editingResource) {
      const { error } = await supabase
        .from('counseling_resources')
        .update(payload)
        .eq('id', editingResource.id) as any;
      if (!error) fetchResources();
    } else {
      const { error } = await supabase
        .from('counseling_resources')
        .insert([payload]) as any;
      if (!error) fetchResources();
    }
    setIsModalOpen(false);
  };

  const handleDeleteResource = async (id: string) => {
    const confirm = window.confirm('Are you sure you want to delete this resource?');
    if (!confirm) return;
    const { error } = await supabase
      .from('counseling_resources')
      .delete()
      .eq('id', id) as any;
    if (!error) fetchResources();
  };

  const handleAddStarterResources = async () => {
    if (!userId) return;
    setLoading(true);
    const payloads = STARTER_RESOURCES.map(r => ({
      ...r,
      profile_id: userId,
    }));
    const { error } = await supabase
      .from('counseling_resources')
      .insert(payloads) as any;
    if (!error) fetchResources();
    setLoading(false);
  };

  const handleAiCounsel = async () => {
    if (!aiSituation.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    
    try {
      const res = await fetch('/api/ai/counsel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: aiSituation })
      });
      const data = await res.json();
      if (data.text) {
        setAiResponse(data.text);
      } else {
        setAiResponse('Error generating counsel.');
      }
    } catch (err) {
      setAiResponse('An error occurred.');
    }
    setIsAiLoading(false);
  };

  const handleSaveAiAsResource = () => {
    setIsAiModalOpen(false);
    handleOpenModal();
    setTitle('AI Counsel: ' + aiSituation.substring(0, 30) + '...');
    setContent(aiResponse);
  };

  const COUNSELING_CATS = CATEGORIES.filter(c => c.id === 'all' || (!COMMUNITY_CATEGORIES.includes(c.id) && c.id !== 'other'));
  const COMMUNITY_CATS = CATEGORIES.filter(c => c.id === 'all' || COMMUNITY_CATEGORIES.includes(c.id));
  const activeCats = activeSection === 'counseling' ? [...COUNSELING_CATS, { id: 'other', label: 'Other' }] : COMMUNITY_CATS;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Section Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 max-w-md">
        <button
          onClick={() => { setActiveSection('counseling'); setSelectedCategory('all'); }}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all",
            activeSection === 'counseling'
              ? "bg-[#022d5c] text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          📖 Counseling
        </button>
        <button
          onClick={() => { setActiveSection('community'); setSelectedCategory('all'); }}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all",
            activeSection === 'community'
              ? "bg-[#022d5c] text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          🤝 Community Resources
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-playfair text-[#022d5c] font-bold">
            {activeSection === 'counseling' ? 'Counseling' : 'Community Resources'}
          </h1>
          <p className="text-gray-600 mt-2">
            {activeSection === 'counseling' 
              ? 'Pastoral counseling resources, scripture references, and guidance.'
              : 'Local resources for food, housing, shelter, crisis support, and more.'}
          </p>
        </div>
        <div className="flex gap-2">
          {activeSection === 'counseling' && (
            <Button onClick={() => setIsAiModalOpen(true)} className="bg-[#D0A348] hover:bg-[#b88c3a] text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Quick Counsel
            </Button>
          )}
          <Button onClick={() => {
            handleOpenModal();
            if (activeSection === 'community') setCategory('food_pantry');
            else setCategory('grief');
          }} className="bg-[#022d5c] hover:bg-[#011c3a] text-white">
            <Plus className="w-4 h-4 mr-2" />
            {activeSection === 'counseling' ? 'Add Resource' : 'Add Local Resource'}
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            placeholder={activeSection === 'counseling' 
              ? "Search by title, content, scripture, or tags..." 
              : "Search by name, address, phone, or website..."}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
          {activeCats.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors",
                selectedCategory === cat.id 
                  ? "bg-[#022d5c] text-white border-[#022d5c]" 
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading resources...</div>
      ) : resources.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Book className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <CardTitle className="mb-2">Your library is empty</CardTitle>
            <CardDescription className="mb-6 max-w-md mx-auto">
              Start building your pastoral counseling library by adding a resource or using our curated starter set.
            </CardDescription>
            <Button onClick={handleAddStarterResources} className="bg-[#022d5c] hover:bg-[#011c3a]">
              Add Starter Resources
            </Button>
          </CardContent>
        </Card>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No resources found matching your search and category filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map(resource => {
            const isExpanded = expandedCards[resource.id];
            const catLabel = CATEGORIES.find(c => c.id === resource.category)?.label || resource.category;
            
            return (
              <Card key={resource.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 flex-row justify-between items-start space-y-0">
                  <div>
                    <span className="inline-block px-2 py-1 bg-[#F8F5EE] text-[#022d5c] text-xs font-medium rounded mb-2">
                      {catLabel}
                    </span>
                    <CardTitle className="text-lg leading-tight">{resource.title}</CardTitle>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button 
                      onClick={() => {
                        const lines = [resource.title];
                        lines.push(catLabel);
                        if (resource.phone) lines.push(`Phone: ${resource.phone}`);
                        if (resource.address) lines.push(`Address: ${resource.address}`);
                        if (resource.website) lines.push(`Website: ${resource.website}`);
                        if (resource.hours) lines.push(`Hours: ${resource.hours}`);
                        lines.push('');
                        lines.push(resource.content);
                        if (resource.scripture_references?.length) {
                          lines.push('');
                          lines.push('Scripture: ' + resource.scripture_references.join(', '));
                        }
                        navigator.clipboard.writeText(lines.join('\n'));
                        setCopiedId(resource.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }} 
                      className={cn(
                        "p-1.5 rounded hover:bg-gray-100 transition-colors",
                        copiedId === resource.id ? "text-green-500" : "text-gray-400 hover:text-[#022d5c]"
                      )}
                      title="Copy to share"
                    >
                      {copiedId === resource.id ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleOpenModal(resource)} className="p-1.5 text-gray-400 hover:text-[#022d5c] rounded hover:bg-gray-100">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteResource(resource.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div 
                    className={cn(
                      "text-sm text-gray-700 whitespace-pre-wrap mb-4 cursor-pointer relative",
                      !isExpanded && "line-clamp-3"
                    )}
                    onClick={() => toggleExpand(resource.id)}
                  >
                    {resource.content}
                  </div>
                  
                  <div className="mt-auto space-y-3 pt-4 border-t border-gray-100">
                    {/* Contact Info for Community Resources */}
                    {(resource.phone || resource.address || resource.website || resource.hours) && (
                      <div className="bg-blue-50/50 rounded-lg p-3 space-y-1.5 text-sm">
                        {resource.phone && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <a href={`tel:${resource.phone}`} className="hover:text-blue-600 hover:underline">{resource.phone}</a>
                          </div>
                        )}
                        {resource.address && (
                          <div className="flex items-start gap-2 text-gray-700">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                            <span>{resource.address}</span>
                          </div>
                        )}
                        {resource.website && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <a href={resource.website.startsWith('http') ? resource.website : `https://${resource.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline truncate">{resource.website}</a>
                          </div>
                        )}
                        {resource.hours && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{resource.hours}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {resource.scripture_references && resource.scripture_references.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <Book className="w-3.5 h-3.5 text-[#D0A348] mt-0.5" />
                        {resource.scripture_references.map((ref, idx) => (
                          <span key={idx} className="bg-[#D0A348]/10 text-[#D0A348] text-xs px-2 py-0.5 rounded">
                            {ref}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                        {resource.tags.map((tag, idx) => (
                          <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-playfair text-[#022d5c] font-bold mb-6">
              {editingResource ? 'Edit Resource' : 'Add Resource'}
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select 
                  id="category" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <textarea 
                  id="content" 
                  rows={8} 
                  value={content} 
                  onChange={e => setContent(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div>
                <Label htmlFor="scriptures">Scripture References (comma-separated)</Label>
                <Input id="scriptures" placeholder="e.g. John 3:16, Romans 8:28" value={scriptures} onChange={e => setScriptures(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" placeholder="e.g. faith, hope, marriage" value={tags} onChange={e => setTags(e.target.value)} />
              </div>

              {/* Contact Info Fields - shown for community categories or when any contact field has data */}
              {(COMMUNITY_CATEGORIES.includes(category) || phone || address || website || hours) && (
                <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  <p className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> Local Resource Contact Info
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="(555) 123-4567" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" placeholder="www.example.org" value={website} onChange={e => setWebsite(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" placeholder="123 Main St, City, State ZIP" value={address} onChange={e => setAddress(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="hours">Hours</Label>
                    <Input id="hours" placeholder="Mon-Fri 9am-5pm, Sat 10am-2pm" value={hours} onChange={e => setHours(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveResource} className="bg-[#022d5c] hover:bg-[#011c3a]">Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Counsel Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8 relative flex flex-col max-h-[90vh]">
            <button onClick={() => setIsAiModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-playfair text-[#D0A348] font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6" /> AI Quick Counsel
            </h2>
            <p className="text-gray-500 mb-6 text-sm">Describe a situation to receive biblically sound, practical guidance and talking points.</p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
              <div>
                <Label htmlFor="aiSituation">Describe the situation...</Label>
                <textarea 
                  id="aiSituation" 
                  rows={4} 
                  value={aiSituation} 
                  onChange={e => setAiSituation(e.target.value)}
                  placeholder="e.g., A couple came to me after 15 years of marriage. They are struggling with communication and feelings of resentment..."
                  className="flex w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Button onClick={handleAiCounsel} disabled={isAiLoading || !aiSituation.trim()} className="bg-[#D0A348] hover:bg-[#b88c3a] w-full text-white font-medium">
                {isAiLoading ? 'Generating Counsel...' : 'Get Guidance'}
              </Button>

              {aiResponse && (
                <div className="mt-6">
                  <h3 className="font-semibold text-[#022d5c] mb-2">AI Guidance</h3>
                  <div className="p-4 bg-[#F8F5EE] rounded-lg text-sm text-gray-800 whitespace-pre-wrap border border-[#e0dac8]">
                    {aiResponse}
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleSaveAiAsResource} className="bg-[#022d5c] hover:bg-[#011c3a]">
                      Save as Resource
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
