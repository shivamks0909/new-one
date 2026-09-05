-- 016: Client invoice generation + enterprise Excel export

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  project_id INTEGER REFERENCES projects(id),
  client_id INTEGER REFERENCES clients(id),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  client_rate DECIMAL(10,2) NOT NULL,
  total_approved_completes INTEGER NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'DRAFT',
  generated_by INTEGER REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  notes TEXT
);

-- Invoice line items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id),
  response_id INTEGER REFERENCES responses(id),
  uid VARCHAR(255) NOT NULL,
  country VARCHAR(10),
  survey_link VARCHAR(100),
  status VARCHAR(20),
  completion_date TIMESTAMP,
  rate DECIMAL(10,2) NOT NULL,
  line_amount DECIMAL(10,2) NOT NULL
);