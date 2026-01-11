-- First, add new AI-focused category values to the task_category enum
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'ai_workflows';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'vibe_coding';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'prompt_engineering';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'ai_video';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'web_design';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'general';

-- Now insert comprehensive AI-focused skills organized by the new categories
-- Using ON CONFLICT to skip duplicates

-- =============================================
-- PROMPT ENGINEERING SKILLS
-- =============================================
INSERT INTO skills (name, category, icon) VALUES
('ChatGPT Prompt Engineering', 'ai', 'message-circle'),
('Claude Prompt Engineering', 'ai', 'brain'),
('GPT-4/GPT-5 Optimization', 'ai', 'sparkles'),
('Midjourney Prompting', 'ai', 'image'),
('DALL-E Prompting', 'ai', 'palette'),
('Stable Diffusion Prompting', 'ai', 'wand-2'),
('System Prompt Design', 'ai', 'file-code'),
('Few-Shot Learning Prompts', 'ai', 'layers'),
('Chain-of-Thought Prompting', 'ai', 'git-branch'),
('Retrieval-Augmented Generation (RAG)', 'ai', 'search-code'),
('Prompt Injection Prevention', 'ai', 'shield-check'),
('AI Persona Development', 'ai', 'user-cog'),
('LLM Fine-tuning', 'ai', 'settings-2'),
('Prompt Template Libraries', 'ai', 'library')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- VIBE CODING SKILLS
-- =============================================
INSERT INTO skills (name, category, icon) VALUES
('Cursor AI Development', 'ai', 'code'),
('Windsurf Development', 'ai', 'wind'),
('GitHub Copilot', 'ai', 'github'),
('Lovable Development', 'ai', 'heart'),
('v0 by Vercel', 'ai', 'box'),
('Replit Agent', 'ai', 'terminal'),
('Bolt.new Development', 'ai', 'zap'),
('AI-Assisted Debugging', 'ai', 'bug'),
('AI Code Review', 'ai', 'check-circle'),
('Agentic Coding', 'ai', 'cpu'),
('Claude Artifacts', 'ai', 'file-code-2'),
('AI Pair Programming', 'ai', 'users'),
('Natural Language to Code', 'ai', 'message-square-code')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- AI WORKFLOWS & AUTOMATION SKILLS
-- =============================================
INSERT INTO skills (name, category, icon) VALUES
('n8n Automation', 'ai', 'git-merge'),
('Make.com (Integromat)', 'ai', 'puzzle'),
('Zapier AI Workflows', 'ai', 'workflow'),
('LangChain Development', 'ai', 'link-2'),
('LangGraph Agents', 'ai', 'git-fork'),
('AutoGPT Setup', 'ai', 'bot'),
('CrewAI Development', 'ai', 'users-round'),
('OpenAI API Integration', 'ai', 'plug-2'),
('Claude API Integration', 'ai', 'plug-zap'),
('Gemini API Integration', 'ai', 'sparkle'),
('AI Agent Development', 'ai', 'brain-circuit'),
('Vector Database (Pinecone)', 'ai', 'database'),
('Vector Database (Weaviate)', 'ai', 'database'),
('Vector Database (ChromaDB)', 'ai', 'database'),
('Embeddings & Semantic Search', 'ai', 'search'),
('AI Chatbot Development', 'ai', 'message-circle'),
('Voice AI (ElevenLabs)', 'ai', 'mic'),
('Voice AI (OpenAI Whisper)', 'ai', 'volume-2'),
('AI Customer Support Bots', 'ai', 'headset'),
('MCP (Model Context Protocol)', 'ai', 'cable'),
('Function Calling / Tool Use', 'ai', 'wrench'),
('Multi-Agent Systems', 'ai', 'network')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- AI VIDEO EDITING SKILLS
-- =============================================
INSERT INTO skills (name, category, icon) VALUES
('Runway ML Video', 'ai', 'video'),
('Pika Labs', 'ai', 'clapperboard'),
('Kling AI', 'ai', 'film'),
('Sora (OpenAI)', 'ai', 'movie'),
('HeyGen Avatar Videos', 'ai', 'user-square'),
('Synthesia AI Videos', 'ai', 'monitor-play'),
('D-ID Video Creation', 'ai', 'scan-face'),
('AI Video Upscaling', 'ai', 'maximize'),
('AI Background Removal', 'ai', 'scissors'),
('AI Video Editing (CapCut)', 'ai', 'scissors'),
('AI Lip Sync', 'ai', 'mic-2'),
('AI Voice Cloning for Video', 'ai', 'volume'),
('AI Video Translation', 'ai', 'languages'),
('AI Shorts/Reels Creation', 'ai', 'smartphone'),
('Luma AI 3D/Video', 'ai', 'cube'),
('Topaz Video AI', 'ai', 'sparkles')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- DATA SCIENCE & ML ENGINEERING SKILLS
-- =============================================
INSERT INTO skills (name, category, icon) VALUES
('Machine Learning Engineering', 'ai', 'brain-cog'),
('Deep Learning (PyTorch)', 'ai', 'flame'),
('Deep Learning (TensorFlow)', 'ai', 'activity'),
('Natural Language Processing (NLP)', 'ai', 'message-square'),
('Computer Vision', 'ai', 'eye'),
('Hugging Face Transformers', 'ai', 'smile'),
('Model Training & Fine-tuning', 'ai', 'target'),
('MLOps & Model Deployment', 'ai', 'cloud-upload'),
('Data Pipeline Engineering', 'ai', 'git-branch'),
('Feature Engineering', 'ai', 'sliders'),
('A/B Testing for ML', 'ai', 'split'),
('Model Evaluation & Metrics', 'ai', 'bar-chart'),
('Scikit-learn', 'ai', 'trending-up'),
('XGBoost / LightGBM', 'ai', 'tree-deciduous'),
('Time Series Forecasting', 'ai', 'clock'),
('Recommendation Systems', 'ai', 'star'),
('Anomaly Detection', 'ai', 'alert-triangle'),
('Reinforcement Learning', 'ai', 'gamepad'),
('Keras', 'ai', 'layers'),
('ONNX Model Optimization', 'ai', 'gauge')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- AI IMAGE GENERATION SKILLS
-- =============================================
INSERT INTO skills (name, category, icon) VALUES
('Midjourney Mastery', 'ai', 'image-plus'),
('Stable Diffusion XL', 'ai', 'wand'),
('DALL-E 3', 'ai', 'palette'),
('Flux Image Generation', 'ai', 'sparkles'),
('Leonardo AI', 'ai', 'brush'),
('ComfyUI Workflows', 'ai', 'git-graph'),
('ControlNet', 'ai', 'sliders-horizontal'),
('LoRA Training', 'ai', 'settings'),
('AI Photo Editing', 'ai', 'image'),
('AI Product Photography', 'ai', 'camera'),
('AI Logo Design', 'ai', 'hexagon'),
('AI Character Design', 'ai', 'user'),
('AI Concept Art', 'ai', 'mountain'),
('Inpainting & Outpainting', 'ai', 'expand'),
('AI Texture Generation', 'ai', 'grid-3x3'),
('Ideogram AI', 'ai', 'type')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- AI AUDIO SKILLS
-- =============================================
INSERT INTO skills (name, category, icon) VALUES
('ElevenLabs Voice Generation', 'ai', 'audio-waveform'),
('Suno AI Music', 'ai', 'music'),
('Udio AI Music', 'ai', 'music-2'),
('AI Podcast Editing', 'ai', 'podcast'),
('AI Voice Synthesis', 'ai', 'mic-vocal'),
('AI Audio Enhancement', 'ai', 'volume-1'),
('AI Sound Effects', 'ai', 'speaker'),
('AI Music Production', 'ai', 'disc-3'),
('AI Audiobook Narration', 'ai', 'book-audio'),
('AI Transcription Services', 'ai', 'file-text')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- AI BUSINESS & CONSULTING SKILLS
-- =============================================
INSERT INTO skills (name, category, icon) VALUES
('AI Strategy Consulting', 'ai', 'briefcase'),
('AI Implementation Planning', 'ai', 'clipboard-list'),
('AI Tool Selection', 'ai', 'search-check'),
('AI ROI Analysis', 'ai', 'calculator'),
('AI Ethics & Compliance', 'ai', 'scale'),
('AI Training & Workshops', 'ai', 'presentation'),
('AI Process Automation Consulting', 'ai', 'cog'),
('Custom GPT Development', 'ai', 'box'),
('AI SaaS Development', 'ai', 'cloud'),
('AI Startup Advisory', 'ai', 'rocket')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 3D & SPATIAL AI SKILLS
-- =============================================
INSERT INTO skills (name, category, icon) VALUES
('AI 3D Modeling', 'ai', 'box'),
('Gaussian Splatting', 'ai', 'circle-dot'),
('NeRF (Neural Radiance Fields)', 'ai', 'globe'),
('AI 3D Texture Generation', 'ai', 'palette'),
('AI Motion Capture', 'ai', 'move'),
('AI Animation', 'ai', 'play-circle'),
('AI Game Asset Generation', 'ai', 'gamepad-2'),
('Blender AI Addons', 'ai', 'blend')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- EMERGING AI SKILLS
-- =============================================
INSERT INTO skills (name, category, icon) VALUES
('AI Safety & Alignment', 'ai', 'shield'),
('Explainable AI (XAI)', 'ai', 'info'),
('Edge AI / TinyML', 'ai', 'cpu'),
('Federated Learning', 'ai', 'network'),
('Quantum Machine Learning', 'ai', 'atom'),
('AI for Healthcare', 'ai', 'heart-pulse'),
('AI for Finance', 'ai', 'banknote'),
('AI for Legal Tech', 'ai', 'gavel'),
('AI for Education', 'ai', 'graduation-cap'),
('AI for E-commerce', 'ai', 'shopping-cart')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- Update existing generic skills with more specific icons
-- =============================================
UPDATE skills SET icon = 'workflow' WHERE name = 'AI Automation' AND icon = 'bot';
UPDATE skills SET icon = 'brain-circuit' WHERE name = 'AI/ML Development' AND icon = 'brain';