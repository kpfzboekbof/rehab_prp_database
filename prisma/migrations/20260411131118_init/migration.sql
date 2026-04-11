-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chartNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Patient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PRPProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TreatmentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "treatmentDate" DATETIME NOT NULL,
    "bodyPart" TEXT NOT NULL,
    "bodyPartDetail" TEXT,
    "symptoms" TEXT NOT NULL,
    "painBefore" INTEGER NOT NULL,
    "painImmediateAfter" INTEGER,
    "ultrasoundNote" TEXT,
    "physicianNote" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceSnapshot" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "commissionRateSnapshot" REAL NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TreatmentRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TreatmentRecord_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TreatmentRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PRPProduct" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUpAppointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "sourceTreatmentId" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUpAppointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowUpAppointment_sourceTreatmentId_fkey" FOREIGN KEY ("sourceTreatmentId") REFERENCES "TreatmentRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUpCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "calledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledById" TEXT NOT NULL,
    "symptomImprovement" TEXT,
    "longTermPainImprovement" INTEGER,
    "educationDone" BOOLEAN NOT NULL DEFAULT false,
    "appointmentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "patientFeedback" TEXT,
    "notes" TEXT,
    "externalMessageId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'PHONE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUpCall_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "FollowUpAppointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowUpCall_calledById_fkey" FOREIGN KEY ("calledById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DoctorCommissionRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctorId" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DoctorCommissionRate_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_chartNumber_key" ON "Patient"("chartNumber");

-- CreateIndex
CREATE INDEX "Patient_name_idx" ON "Patient"("name");

-- CreateIndex
CREATE INDEX "Patient_deletedAt_idx" ON "Patient"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PRPProduct_name_key" ON "PRPProduct"("name");

-- CreateIndex
CREATE INDEX "TreatmentRecord_patientId_idx" ON "TreatmentRecord"("patientId");

-- CreateIndex
CREATE INDEX "TreatmentRecord_doctorId_idx" ON "TreatmentRecord"("doctorId");

-- CreateIndex
CREATE INDEX "TreatmentRecord_treatmentDate_idx" ON "TreatmentRecord"("treatmentDate");

-- CreateIndex
CREATE INDEX "TreatmentRecord_bodyPart_idx" ON "TreatmentRecord"("bodyPart");

-- CreateIndex
CREATE INDEX "FollowUpAppointment_scheduledAt_idx" ON "FollowUpAppointment"("scheduledAt");

-- CreateIndex
CREATE INDEX "FollowUpAppointment_patientId_idx" ON "FollowUpAppointment"("patientId");

-- CreateIndex
CREATE INDEX "FollowUpAppointment_status_idx" ON "FollowUpAppointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpCall_appointmentId_key" ON "FollowUpCall"("appointmentId");

-- CreateIndex
CREATE INDEX "DoctorCommissionRate_doctorId_effectiveFrom_idx" ON "DoctorCommissionRate"("doctorId", "effectiveFrom");
