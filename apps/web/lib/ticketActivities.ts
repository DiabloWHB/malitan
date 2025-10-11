import { supabase } from "./supabaseClient"

// Types - מותאם לטבלה הקיימת
export type ActivityType = 
  | "created"
  | "assigned"
  | "status_changed"
  | "severity_changed"
  | "note_added"
  | "technician_arrived"
  | "technician_started"
  | "part_used"
  | "file_attached"
  | "comment"

export type Activity = {
  id: string
  ticket_id: string
  company_id: string
  activity_type: ActivityType
  description: string
  metadata?: any
  created_by?: string
  created_by_name?: string
  created_at: string
}

// Icons mapping for each activity type
export const getActivityIcon = (type: ActivityType): string => {
  const icons: Record<ActivityType, string> = {
    created: "🎫",
    assigned: "👨‍🔧",
    status_changed: "🔄",
    severity_changed: "⚠️",
    note_added: "📝",
    technician_arrived: "📍",
    technician_started: "🔧",
    part_used: "🔩",
    file_attached: "📎",
    comment: "💬"
  }
  return icons[type] || "📌"
}

// Get relative time (like "לפני 2 שעות")
export const getRelativeTime = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  
  // תיקון: ווידוא שהתאריכים בזמן נכון
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "כעת"
  if (diffMins === 1) return "לפני דקה"
  if (diffMins < 60) return `לפני ${diffMins} דקות`
  if (diffHours === 1) return "לפני שעה"
  if (diffHours < 24) return `לפני ${diffHours} שעות`
  if (diffDays === 1) return "אתמול"
  if (diffDays < 7) return `לפני ${diffDays} ימים`
  
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks === 1) return "לפני שבוע"
  if (diffWeeks < 4) return `לפני ${diffWeeks} שבועות`
  
  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
}

// Create a new activity
export const createTicketActivity = async (
  ticketId: string,
  activityType: ActivityType,
  description: string,
  metadata?: any,
  createdByName?: string
): Promise<{ data: Activity | null; error: any }> => {
  try {
    // Get current user and company
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: new Error("User not authenticated") }
    }

    // Get user's company_id from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, full_name")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return { data: null, error: new Error("Company not found") }
    }

    const activity = {
      ticket_id: ticketId,
      company_id: profile.company_id,
      activity_type: activityType,
      description,
      metadata: metadata || {},
      created_by: user.id,
      created_by_name: createdByName || profile.full_name || "מערכת"
    }

    const { data, error } = await supabase
      .from("ticket_activities")
      .insert([activity])
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Error creating ticket activity:", error)
    return { data: null, error }
  }
}

// Get all activities for a ticket
export const getTicketActivities = async (
  ticketId: string
): Promise<{ data: Activity[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("ticket_activities")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })

    return { data, error }
  } catch (error) {
    console.error("Error fetching ticket activities:", error)
    return { data: null, error }
  }
}

// Specific activity loggers - מותאם לטבלה

export const logTicketCreated = async (ticketId: string, ticketTitle: string) => {
  return createTicketActivity(
    ticketId,
    "created",  // ✅ שונה מ-"ticket_created"
    `קריאה חדשה נוצרה: "${ticketTitle}"`
  )
}

export const logStatusChange = async (
  ticketId: string,
  oldStatus: string,
  newStatus: string
) => {
  const statusLabels: Record<string, string> = {
    new: "חדש",
    assigned: "שויך",
    in_progress: "בטיפול",
    waiting_parts: "ממתין לחלקים",
    done: "הושלם",
    cancelled: "בוטל"
  }

  return createTicketActivity(
    ticketId,
    "status_changed",  // ✅ נכון
    `הסטטוס שונה מ-"${statusLabels[oldStatus] || oldStatus}" ל-"${statusLabels[newStatus] || newStatus}"`,
    { old_status: oldStatus, new_status: newStatus }
  )
}

export const logTicketAssigned = async (
  ticketId: string,
  technicianName: string
) => {
  return createTicketActivity(
    ticketId,
    "assigned",  // ✅ שונה מ-"assigned_to_technician"
    `הקריאה שויכה לטכנאי: ${technicianName}`,
    { technician_name: technicianName }
  )
}

export const logNoteAdded = async (
  ticketId: string,
  noteContent: string,
  createdByName?: string
) => {
  return createTicketActivity(
    ticketId,
    "note_added",  // ✅ נכון
    `הערה נוספה: "${noteContent.substring(0, 100)}${noteContent.length > 100 ? '...' : ''}"`,
    { note_content: noteContent },
    createdByName
  )
}

export const logTechnicianArrived = async (
  ticketId: string,
  technicianName: string
) => {
  return createTicketActivity(
    ticketId,
    "technician_arrived",  // ✅ שונה מ-"technician_on_site"
    `${technicianName} הגיע לאתר`,
    { technician_name: technicianName }
  )
}

export const logTechnicianStarted = async (
  ticketId: string,
  technicianName: string
) => {
  return createTicketActivity(
    ticketId,
    "technician_started",  // ✅ שונה מ-"technician_confirmed"
    `${technicianName} התחיל בטיפול`,
    { technician_name: technicianName }
  )
}

export const logPartUsed = async (
  ticketId: string,
  partDescription: string,
  quantity: number = 1
) => {
  return createTicketActivity(
    ticketId,
    "part_used",  // ✅ שונה מ-"parts_ordered"
    `חלק שימש: ${partDescription} (כמות: ${quantity})`,
    { part_description: partDescription, quantity }
  )
}

export const logFileAttached = async (
  ticketId: string,
  fileName: string,
  fileType?: string
) => {
  return createTicketActivity(
    ticketId,
    "file_attached",
    `קובץ צורף: ${fileName}`,
    { file_name: fileName, file_type: fileType }
  )
}

export const logComment = async (
  ticketId: string,
  commentContent: string,
  createdByName?: string
) => {
  return createTicketActivity(
    ticketId,
    "comment",
    commentContent,
    {},
    createdByName
  )
}

export const logSeverityChange = async (
  ticketId: string,
  oldSeverity: string,
  newSeverity: string
) => {
  const severityLabels: Record<string, string> = {
    low: "נמוכה",
    medium: "בינונית",
    high: "גבוהה",
    critical: "קריטית"
  }

  return createTicketActivity(
    ticketId,
    "severity_changed",
    `החומרה שונתה מ-"${severityLabels[oldSeverity] || oldSeverity}" ל-"${severityLabels[newSeverity] || newSeverity}"`,
    { old_severity: oldSeverity, new_severity: newSeverity }
  )
}

// Emergency-specific activity loggers
export const logEmergencyStatusChange = async (
  ticketId: string,
  newStatus: string,
  technicianName?: string
) => {
  const statusLabels: Record<string, string> = {
    dispatched: "נשלח לטכנאי",  // ✅ עודכן מ-"נשלח טכנאי"
    en_route: "טכנאי בדרך",
    on_site: "טכנאי באתר",
    rescuing: "חילוץ בתהליך",
    rescued: "חילוץ הושלם"
  }

  const description = technicianName 
    ? `${statusLabels[newStatus] || newStatus} - ${technicianName}`
    : statusLabels[newStatus] || newStatus

  return createTicketActivity(
    ticketId,
    "status_changed",
    description,
    { emergency_status: newStatus, technician_name: technicianName }
  )
}

export const logEmergencyPulled = async (
  ticketId: string,
  technicianName: string
) => {
  return createTicketActivity(
    ticketId,
    "assigned",
    `🚨 ${technicianName} משך את קריאת החירום ויוצא לדרך`,
    { action: "emergency_pulled", technician_name: technicianName }
  )
}

export const logEmergencyRescueCompleted = async (
  ticketId: string,
  responseTimeMinutes: number,
  isElevatorOperational: boolean
) => {
  const description = isElevatorOperational
    ? `✅ חילוץ הושלם בהצלחה - המעלית תקינה (זמן תגובה: ${responseTimeMinutes} דקות)`
    : `✅ חילוץ הושלם - המעלית דרושה תיקון (זמן תגובה: ${responseTimeMinutes} דקות)`

  return createTicketActivity(
    ticketId,
    "status_changed",
    description,
    { 
      action: "rescue_completed",
      response_time_minutes: responseTimeMinutes,
      is_elevator_operational: isElevatorOperational
    }
  )
}

export const logEmergencyCancelled = async (
  ticketId: string,
  reason: string
) => {
  return createTicketActivity(
    ticketId,
    "status_changed",
    `🚫 קריאת חירום בוטלה: ${reason}`,
    { action: "emergency_cancelled", cancellation_reason: reason }
  )
}