'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Check, Trash2,
  Clock, MapPin, Tag, User, Users, Filter, Sparkles, AlertCircle, Dumbbell,
  ShoppingBag, ChefHat, Heart, X, CheckCircle2, CalendarDays, List
} from 'lucide-react';
import type { CalendarEvent, EventCategory, EventAssignee } from '@/types';
import { createClient } from '@/lib/supabase/client';

const CATEGORY_CONFIG: Record<EventCategory, { label: string; color: string; badgeBg: string; textCol: string; borderCol: string; icon: any }> = {
  sport: { label: 'Sport & Fitness', color: 'bg-emerald-500', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40', textCol: 'text-emerald-700 dark:text-emerald-300', borderCol: 'border-emerald-200 dark:border-emerald-800', icon: Dumbbell },
  famiglia: { label: 'Famiglia & Coppia', color: 'bg-rose-500', badgeBg: 'bg-rose-50 dark:bg-rose-950/40', textCol: 'text-rose-700 dark:text-rose-300', borderCol: 'border-rose-200 dark:border-rose-800', icon: Heart },
  lavoro: { label: 'Lavoro & Studio', color: 'bg-blue-500', badgeBg: 'bg-blue-50 dark:bg-blue-950/40', textCol: 'text-blue-700 dark:text-blue-300', borderCol: 'border-blue-200 dark:border-blue-800', icon: Clock },
  casa: { label: 'Casa & Manutenzione', color: 'bg-amber-500', badgeBg: 'bg-amber-50 dark:bg-amber-950/40', textCol: 'text-amber-700 dark:text-amber-300', borderCol: 'border-amber-200 dark:border-amber-800', icon: CalendarIcon },
  spesa: { label: 'Spesa & Meal Prep', color: 'bg-teal-500', badgeBg: 'bg-teal-50 dark:bg-teal-950/40', textCol: 'text-teal-700 dark:text-teal-300', borderCol: 'border-teal-200 dark:border-teal-800', icon: ShoppingBag },
  medico: { label: 'Salute & Visite', color: 'bg-purple-500', badgeBg: 'bg-purple-50 dark:bg-purple-950/40', textCol: 'text-purple-700 dark:text-purple-300', borderCol: 'border-purple-200 dark:border-purple-800', icon: AlertCircle },
  altro: { label: 'Altro Impegno', color: 'bg-slate-500', badgeBg: 'bg-slate-50 dark:bg-slate-800/40', textCol: 'text-slate-700 dark:text-slate-300', borderCol: 'border-slate-200 dark:border-slate-800', icon: Tag },
};

const ASSIGNEE_CONFIG: Record<EventAssignee, { label: string; badge: string; icon: string }> = {
  lui: { label: 'Lui (85kg / Nuoto)', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', icon: '👨' },
  lei: { label: 'Lei (50kg / Palestra)', badge: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800', icon: '👩' },
  coppia: { label: 'Insieme (Coppia)', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800', icon: '💑' },
  famiglia: { label: 'Tutta la Famiglia', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800', icon: '🏠' },
};

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export default function CalendarioPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterAssignee, setFilterAssignee] = useState<EventAssignee | 'tutti'>('tutti');
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'tutte'>('tutte');
  const [viewMode, setViewMode] = useState<'mese' | 'agenda'>('mese');

  // Modal Form State
  const [showModal, setShowModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(selectedDateStr);
  const [formStartTime, setFormStartTime] = useState('18:00');
  const [formEndTime, setFormEndTime] = useState('19:00');
  const [formCategory, setFormCategory] = useState<EventCategory>('famiglia');
  const [formAssignee, setFormAssignee] = useState<EventAssignee>('famiglia');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const supabase = createClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Caricamento Iniziale
  const loadEvents = useCallback(() => {
    if (typeof window === 'undefined') return;
    const local = localStorage.getItem('casa_app_calendar_events');
    if (local) {
      try {
        setEvents(JSON.parse(local));
      } catch {
        // ignore
      }
    } else {
      // Eventi di default per la routine sportiva e familiare
      const today = new Date();
      const baseYear = today.getFullYear();
      const baseMonth = String(today.getMonth() + 1).padStart(2, '0');
      const baseDay = String(today.getDate()).padStart(2, '0');
      const todayStr = `${baseYear}-${baseMonth}-${baseDay}`;

      const defaultEvents: CalendarEvent[] = [
        {
          id: 'def_sport_lui_1',
          title: '🏊 Nuoto Lui (Sessione 1h)',
          description: '3 ore settimanali allenamento in vasca',
          date: todayStr,
          start_time: '19:00',
          end_time: '20:00',
          category: 'sport',
          assigned_to: 'lui',
          completed: false,
          location: 'Piscina Comunale',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'def_sport_lei_1',
          title: '🏋️ Palestra Lei (Sessione 1h)',
          description: '2 ore settimanali fitness e pesi',
          date: todayStr,
          start_time: '18:30',
          end_time: '19:30',
          category: 'sport',
          assigned_to: 'lei',
          completed: false,
          location: 'Palestra Fit Club',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'def_prep_dom',
          title: '🍳 Master Batch Cooking & Meal Prep',
          description: 'Cottura cereali, teglie forno e porzionatura schiscette per la settimana',
          date: todayStr,
          start_time: '16:00',
          end_time: '18:00',
          category: 'spesa',
          assigned_to: 'coppia',
          completed: false,
          location: 'Cucina di Casa',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setEvents(defaultEvents);
      localStorage.setItem('casa_app_calendar_events', JSON.stringify(defaultEvents));
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const persistEvents = (updated: CalendarEvent[]) => {
    setEvents(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('casa_app_calendar_events', JSON.stringify(updated));
    }
  };

  // Navigazione Mese
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Calcolo Griglia Mese (Inizio Lunedì)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstWeekday = (firstDay.getDay() + 6) % 7; // 0 = Lunedì
    const daysInMonth = lastDay.getDate();

    // Giorni mese precedente
    const prevMonthDays = [];
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = prevLastDay - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      prevMonthDays.push({ day: d, dateStr, isCurrentMonth: false });
    }

    // Giorni mese corrente
    const currentMonthDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      currentMonthDays.push({ day: d, dateStr, isCurrentMonth: true });
    }

    // Giorni mese successivo per completare le righe da 7
    const nextMonthDays = [];
    const totalShown = prevMonthDays.length + currentMonthDays.length;
    const remaining = totalShown % 7 === 0 ? 0 : 7 - (totalShown % 7);
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      nextMonthDays.push({ day: d, dateStr, isCurrentMonth: false });
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  }, [currentDate]);

  // Eventi Filtrati
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchAssignee = filterAssignee === 'tutti' || ev.assigned_to === filterAssignee;
      const matchCategory = filterCategory === 'tutte' || ev.category === filterCategory;
      return matchAssignee && matchCategory;
    });
  }, [events, filterAssignee, filterCategory]);

  // Eventi raggruppati per data
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [filteredEvents]);

  // Eventi del giorno selezionato
  const selectedDayEvents = useMemo(() => {
    return (eventsByDate.get(selectedDateStr) || []).sort((a, b) => {
      const tA = a.start_time || '00:00';
      const tB = b.start_time || '00:00';
      return tA.localeCompare(tB);
    });
  }, [eventsByDate, selectedDateStr]);

  // Prossimi Impegni (Agenda)
  const upcomingEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return filteredEvents
      .filter((ev) => ev.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || ''))
      .slice(0, 15);
  }, [filteredEvents]);

  // Toggle Completato
  const handleToggleComplete = (id: string) => {
    const updated = events.map((ev) => (ev.id === id ? { ...ev, completed: !ev.completed } : ev));
    persistEvents(updated);
  };

  // Elimina Evento
  const handleDeleteEvent = (id: string) => {
    const updated = events.filter((ev) => ev.id !== id);
    persistEvents(updated);
    showToast('Impegno eliminato.');
  };

  // Apri Modale Aggiungi
  const handleOpenAdd = (dateStr?: string) => {
    setEditingEventId(null);
    setFormTitle('');
    setFormDate(dateStr || selectedDateStr);
    setFormStartTime('18:00');
    setFormEndTime('19:00');
    setFormCategory('famiglia');
    setFormAssignee('famiglia');
    setFormLocation('');
    setFormDescription('');
    setShowModal(true);
  };

  // Apri Modale Modifica
  const handleOpenEdit = (ev: CalendarEvent) => {
    setEditingEventId(ev.id);
    setFormTitle(ev.title);
    setFormDate(ev.date);
    setFormStartTime(ev.start_time || '');
    setFormEndTime(ev.end_time || '');
    setFormCategory(ev.category);
    setFormAssignee(ev.assigned_to);
    setFormLocation(ev.location || '');
    setFormDescription(ev.description || '');
    setShowModal(true);
  };

  // Salva Evento
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingEventId) {
      const updated = events.map((ev) =>
        ev.id === editingEventId
          ? {
              ...ev,
              title: formTitle.trim(),
              date: formDate,
              start_time: formStartTime || undefined,
              end_time: formEndTime || undefined,
              category: formCategory,
              assigned_to: formAssignee,
              location: formLocation.trim() || undefined,
              description: formDescription.trim() || undefined,
              updated_at: new Date().toISOString(),
            }
          : ev
      );
      persistEvents(updated);
      showToast('Impegno aggiornato con successo!');
    } else {
      const newEvent: CalendarEvent = {
        id: `event_${Date.now()}`,
        title: formTitle.trim(),
        date: formDate,
        start_time: formStartTime || undefined,
        end_time: formEndTime || undefined,
        category: formCategory,
        assigned_to: formAssignee,
        completed: false,
        location: formLocation.trim() || undefined,
        description: formDescription.trim() || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      persistEvents([...events, newEvent]);
      showToast('Nuovo impegno aggiunto al calendario!');
    }

    setShowModal(false);
  };

  // Aggiungi Routine Sport & Famiglia Automatiche del Mese
  const handlePopulateRoutine = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const newRoutineEvents: CalendarEvent[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay(); // 0 = Dom, 1 = Lun, ...
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Nuoto Lui: Lun (1), Mer (3), Ven (5)
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        newRoutineEvents.push({
          id: `routine_nuoto_${dateStr}`,
          title: '🏊 Nuoto Lui (Sessione 1h)',
          description: 'Allenamento 3 ore a settimana',
          date: dateStr,
          start_time: '19:00',
          end_time: '20:00',
          category: 'sport',
          assigned_to: 'lui',
          completed: false,
          location: 'Piscina Comunale',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Palestra Lei: Mar (2), Gio (4)
      if (dayOfWeek === 2 || dayOfWeek === 4) {
        newRoutineEvents.push({
          id: `routine_palestra_${dateStr}`,
          title: '🏋️ Palestra Lei (Sessione 1h)',
          description: 'Allenamento 2 ore a settimana',
          date: dateStr,
          start_time: '18:30',
          end_time: '19:30',
          category: 'sport',
          assigned_to: 'lei',
          completed: false,
          location: 'Palestra Fit Club',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Master Batch Cooking: Domenica (0)
      if (dayOfWeek === 0) {
        newRoutineEvents.push({
          id: `routine_batch_${dateStr}`,
          title: '🍳 Master Batch Cooking & Schiscette',
          description: 'Cottura cereali, teglie forno e stoccaggio barattoli freezer',
          date: dateStr,
          start_time: '16:00',
          end_time: '18:00',
          category: 'spesa',
          assigned_to: 'coppia',
          completed: false,
          location: 'Cucina',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Spesa del Mese Unica (450€): 1° Sabato del mese
      if (dayOfWeek === 6 && day <= 7) {
        newRoutineEvents.push({
          id: `routine_spesa_${dateStr}`,
          title: '🛒 Maxi Spesa Mensile (Budget 450€)',
          description: 'Spesa unica del mese: secco dispensa, carni/pesce da surgelare e verdure',
          date: dateStr,
          start_time: '09:30',
          end_time: '11:30',
          category: 'spesa',
          assigned_to: 'coppia',
          completed: false,
          location: 'Ipermercato',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Evita duplicati per ID
    const existingIds = new Set(events.map((e) => e.id));
    const toAdd = newRoutineEvents.filter((e) => !existingIds.has(e.id));

    if (toAdd.length === 0) {
      showToast('Tutti gli impegni della routine del mese sono già presenti!');
      return;
    }

    const updated = [...events, ...toAdd];
    persistEvents(updated);
    showToast(`Generati con successo ${toAdd.length} impegni di routine per ${MONTH_NAMES[month]}!`);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Toast Notifiche */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Intestazione Pagina */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/90 via-slate-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-indigo-900/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
              <CalendarIcon className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Calendario &amp; Impegni Famiglia</h2>
              <p className="text-xs text-indigo-200/80">
                Pianificazione condivisa per la coppia: lavoro, orari sportivi, batch cooking e vita familiare
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePopulateRoutine}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/60 hover:bg-indigo-600 text-white text-xs font-semibold border border-indigo-400/30 transition shadow-xs"
            title="Genera con un click gli impegni fissi (Nuoto Lui 3x, Palestra Lei 2x, Batch Cooking Domenica, Spesa Sabato)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Genera Routine Mese</span>
          </button>

          <button
            onClick={() => handleOpenAdd(selectedDateStr)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Impegno</span>
          </button>
        </div>
      </div>

      {/* Barra Filtri & Modalità di Vista */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filtro Assegnatario (Persona) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Chi:</span>
          {(['tutti', 'lui', 'lei', 'coppia', 'famiglia'] as const).map((key) => {
            const isSelected = filterAssignee === key;
            const label =
              key === 'tutti'
                ? '👥 Tutti'
                : key === 'lui'
                ? '👨 Lui (Nuoto)'
                : key === 'lei'
                ? '👩 Lei (Palestra)'
                : key === 'coppia'
                ? '💑 Coppia'
                : '🏠 Famiglia';

            return (
              <button
                key={key}
                onClick={() => setFilterAssignee(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Toggle Vista (Mese vs Agenda) */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <button
              onClick={() => setViewMode('mese')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition ${
                viewMode === 'mese'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mese</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition ${
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTENUTO PRINCIPALE */}
      {viewMode === 'mese' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonna Sinistra: Calendario Mese (2 cols) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            {/* Header Mese con Navigazione */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button
                  onClick={goToToday}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition"
                >
                  Oggi
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                  title="Mese precedente"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                  title="Mese successivo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Intestazione Giorni Settimana */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 py-1 uppercase tracking-wider">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>

            {/* Griglia Giorni Mese */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarDays.map((d, idx) => {
                const isToday = d.dateStr === todayStr;
                const isSelected = d.dateStr === selectedDateStr;
                const dayEvents = eventsByDate.get(d.dateStr) || [];
                const hasEvents = dayEvents.length > 0;

                return (
                  <button
                    key={`${d.dateStr}_${idx}`}
                    onClick={() => setSelectedDateStr(d.dateStr)}
                    className={`min-h-[75px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-2xl flex flex-col justify-between text-left transition border relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500'
                        : isToday
                        ? 'border-emerald-500/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : d.isCurrentMonth
                        ? 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        : 'border-transparent text-slate-300 dark:text-slate-600 bg-transparent opacity-40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                            : isSelected
                            ? 'bg-indigo-600 text-white font-extrabold'
                            : d.isCurrentMonth
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {d.day}
                      </span>

                      {hasEvents && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Anteprima Eventi del Giorno */}
                    <div className="w-full space-y-1 mt-1">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.famiglia;
                        return (
                          <div
                            key={ev.id}
                            className={`text-[9px] sm:text-[10px] truncate px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1 ${
                              ev.completed
                                ? 'line-through opacity-50 bg-slate-200 dark:bg-slate-800 text-slate-500'
                                : `${cat.badgeBg} ${cat.textCol}`
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.color}`} />
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] text-slate-400 block px-1">
                          +{dayEvents.length - 2} altri
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colonna Destra: Dettaglio del Giorno Selezionato */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-500" />
                    <span>
                      {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedDayEvents.length === 0
                      ? 'Nessun impegno in programma'
                      : `${selectedDayEvents.length} impegni registrati`}
                  </p>
                </div>

                <button
                  onClick={() => handleOpenAdd(selectedDateStr)}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
                  title="Aggiungi impegno in questa data"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Lista Impegni del Giorno */}
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 scrollbar-none">
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
                    <CalendarDays className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-xs">Giornata libera da impegni.</p>
                    <button
                      onClick={() => handleOpenAdd(selectedDateStr)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition mt-1"
                    >
                      Aggiungi un impegno
                    </button>
                  </div>
                ) : (
                  selectedDayEvents.map((ev) => {
                    const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.famiglia;
                    const ass = ASSIGNEE_CONFIG[ev.assigned_to] || ASSIGNEE_CONFIG.famiglia;

                    return (
                      <div
                        key={ev.id}
                        className={`p-3.5 rounded-2xl border transition space-y-2 ${
                          ev.completed
                            ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <button
                              onClick={() => handleToggleComplete(ev.id)}
                              className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                                ev.completed
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                              }`}
                            >
                              {ev.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>

                            <div>
                              <p
                                className={`text-xs font-bold text-slate-900 dark:text-white ${
                                  ev.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                                }`}
                              >
                                {ev.title}
                              </p>
                              {ev.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 transition"
                              title="Elimina impegno"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Metadati (Orario, Chi, Luogo) */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-1">
                          {ev.start_time && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {ev.start_time}
                              {ev.end_time ? ` - ${ev.end_time}` : ''}
                            </span>
                          )}

                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${ass.badge}`}>
                            <span>{ass.icon}</span>
                            <span>{ass.label.split(' ')[0]}</span>
                          </span>

                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${cat.badgeBg} ${cat.textCol}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cat.color}`} />
                            <span>{cat.label}</span>
                          </span>

                          {ev.location && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{ev.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Promemoria Routine Sportiva & Cucina */}
            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-4 rounded-3xl border border-indigo-200 dark:border-indigo-800/60 space-y-2 text-xs">
              <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Routine Settimanale Coppia:
              </span>
              <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <span>🏊 <strong>Lui:</strong> Nuoto 3h/sett (Lun-Mer-Ven 19:00)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🏋️ <strong>Lei:</strong> Palestra 2h/sett (Mar-Gio 18:30)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🍳 <strong>Insieme:</strong> Meal Prep Domenica (16:00 - 18:00)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🛒 <strong>Spesa:</strong> 1° Sabato del mese (Max 450€)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA AGENDA (LISTA PROSSIMI IMPEGNI) */
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Prossimi Impegni in Programma ({upcomingEvents.length})
              </h3>
              <p className="text-xs text-slate-400">
                Tutti gli appuntamenti della famiglia ordinati cronologicamente
              </p>
            </div>
            <button
              onClick={() => handleOpenAdd()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" /> Aggiungi Impegno
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">
                Nessun impegno futuro in programma. Clicca &quot;Nuovo Impegno&quot; o &quot;Genera Routine Mese&quot;.
              </p>
            ) : (
              upcomingEvents.map((ev) => {
                const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.famiglia;
                const ass = ASSIGNEE_CONFIG[ev.assigned_to] || ASSIGNEE_CONFIG.famiglia;
                const isToday = ev.date === todayStr;

                return (
                  <div key={ev.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleComplete(ev.id)}
                        className={`mt-1 w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                          ev.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                        }`}
                      >
                        {ev.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold ${
                              ev.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {ev.title}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              OGGI
                            </span>
                          )}
                        </div>

                        {ev.description && (
                          <p className="text-[11px] text-slate-500">{ev.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            📅{' '}
                            {new Date(ev.date + 'T00:00:00').toLocaleDateString('it-IT', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          {ev.start_time && (
                            <span className="font-mono">
                              ⏰ {ev.start_time}
                              {ev.end_time ? ` - ${ev.end_time}` : ''}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-md border ${ass.badge}`}>
                            {ass.icon} {ass.label.split(' ')[0]}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md ${cat.badgeBg} ${cat.textCol}`}>
                            {cat.label}
                          </span>
                          {ev.location && <span>📍 {ev.location}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL AGGIUNGI / MODIFICA IMPEGNO */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingEventId ? 'Modifica Impegno' : 'Nuovo Impegno Famiglia'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                  Titolo Impegno *
                </label>
                <input
                  required
                  placeholder="es. Nuoto Matteo, Visita Pediatrica, Spesa, Cena..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Data *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Dalle ore</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Alle ore</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Assegnato a</label>
                  <select
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value as EventAssignee)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  >
                    <option value="famiglia">🏠 Tutta la Famiglia</option>
                    <option value="coppia">💑 Coppia Insieme</option>
                    <option value="lui">👨 Lui (Matteo - Nuoto)</option>
                    <option value="lei">👩 Lei (Palestra)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Categoria</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as EventCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  >
                    <option value="famiglia">Famiglia &amp; Coppia</option>
                    <option value="sport">Sport &amp; Allenamento</option>
                    <option value="lavoro">Lavoro &amp; Ufficio</option>
                    <option value="spesa">Spesa &amp; Meal Prep</option>
                    <option value="casa">Casa &amp; Manutenzione</option>
                    <option value="medico">Salute &amp; Visite</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Luogo (opzionale)</label>
                <input
                  placeholder="es. Piscina, Palestra, Casa, Studio Medico..."
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Note e Dettagli</label>
                <textarea
                  rows={2}
                  placeholder="Note aggiuntive, promemoria materiale da portare..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-500"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Salva Impegno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
