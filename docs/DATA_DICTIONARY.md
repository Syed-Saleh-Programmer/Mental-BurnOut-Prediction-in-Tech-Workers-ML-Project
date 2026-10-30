# Dataset dictionary

All 36 columns in the supplied [research CSV](../mental_health_burnout_tech_2026.csv): 35 raw model inputs and the binary target. Values below are observed in this local file, not clinical thresholds or universal input limits. The source burnout score (0–10) is distinct from the individual CBI score (0–100).

| Column | Role | Stored type | Observed values / range |
| --- | --- | --- | --- |
| `employee_id` | Reference ID; retained as a model input | Integer | 1 to 100000 |
| `age` | Input | Integer | 22 to 55 |
| `gender` | Input | Category | `Female`, `Male`, `Non-binary`, `Prefer not to say` |
| `country` | Input | Category | `Australia`, `Brazil`, `Canada`, `France`, `Germany`, `India`, `Netherlands`, `Singapore`, `UK`, `USA` |
| `job_role` | Input | Category | `Backend Developer`, `Cloud Engineer`, `Cybersecurity Engineer`, `Data Analyst`, `Data Scientist`, `DevOps Engineer`, `Frontend Developer`, `Full Stack Developer`, `ML Engineer`, `Product Manager`, `QA Engineer`, `Software Engineer` |
| `seniority_level` | Input | Category | `Junior`, `Lead`, `Manager`, `Mid`, `Principal`, `Senior` |
| `years_experience` | Input | Integer | 0 to 25 |
| `years_at_company` | Input | Number | 0.1 to 15 |
| `company_size` | Input | Category | `Enterprise (5000+)`, `Large (1001-5000)`, `Mid (201-1000)`, `Small (51-200)`, `Startup (1-50)` |
| `industry` | Input | Category | `AI / ML Startup`, `Consulting`, `Cybersecurity`, `E-commerce`, `Enterprise Software`, `Fintech`, `Gaming`, `Healthcare Tech`, `SaaS / Cloud`, `Social Media / AdTech` |
| `work_mode` | Input | Category | `Hybrid`, `On-site`, `Remote` |
| `salary_usd` | Input | Integer | 40000 to 267961 |
| `work_hours_per_week` | Input | Integer | 35 to 72 |
| `meetings_per_day` | Input | Number | 0 to 12 |
| `team_size` | Input | Integer | 2 to 59 |
| `sleep_hours_per_night` | Input | Number | 3 to 10 |
| `exercise_days_per_week` | Input | Integer | 0 to 7 |
| `vacation_days_taken` | Input | Integer | 0 to 30 |
| `therapy_access` | Input | Integer | 0 to 1 |
| `uses_therapy` | Input | Integer | 0 to 1 |
| `ai_tools_daily` | Input | Integer | 0 to 1 |
| `manager_support_score` | Input | Number | 1 to 10 |
| `work_life_balance_score` | Input | Number | 1 to 10 |
| `job_satisfaction_score` | Input | Number | 1 to 10 |
| `social_support_score` | Input | Number | 1 to 10 |
| `deadline_pressure_score` | Input | Number | 1 to 10 |
| `autonomy_score` | Input | Number | 1 to 10 |
| `stress_score` | Input | Number | 1 to 10 |
| `burnout_score` | Input | Number | 0 to 10 |
| `phq9_score` | Input | Integer | 0 to 27 |
| `phq9_category` | Input | Category | `Mild (5-9)`, `Moderate (10-14)`, `Moderately Severe (15-19)`, `None (0-4)`, `Severe (20-27)` |
| `gad7_score` | Input | Integer | 0 to 21 |
| `gad7_category` | Input | Category | `Mild (5-9)`, `Minimal (0-4)`, `Moderate (10-14)`, `Severe (15-21)` |
| `burnout_level` | Input | Category | `High`, `Low`, `Moderate`, `Severe` |
| `seeks_mental_health_support` | Input | Integer | 0 to 1 |
| `job_change_intention` | Target (0 = stay intention; 1 = job-change intention) | Integer | 0 to 1 |

## Import-specific fields

The HR importer also accepts `employee_name`, `department`, `team`, and `cbi_score` as optional descriptive fields. These are not original model inputs. CBI 0–100 values are stored separately and are never converted into the source burnout measure. A profile can be analyzed descriptively with only one usable wellbeing indicator. Saved-model inference still requires all 35 compatible raw inputs.

## Engineered model inputs

| Derived field | Serving behavior |
| --- | --- |
| `work_hours_to_sleep_ratio` | `work_hours_per_week / (sleep_hours_per_night * 7 + 1e-5)` |
| `total_mental_load` | Sum of the notebook's existing named components; equals `stress_score` in this CSV because the other component names do not match the source columns |

The backend computes both derived features. See the [notebook](../Mental_burnut_and_turn_over_latest.ipynb), [serving implementation](../backend/service.py), and [project analysis](PROJECT_ANALYSIS.md) for the exact contract and known preprocessing limitation.
