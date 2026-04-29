# Effect of asynchronous standups on team throughput in distributed engineering organizations

## Abstract

We report on a 12-week field study of 14 distributed software engineering teams (n=187 engineers) comparing synchronous daily standups against asynchronous text-based standups posted to a shared channel. Throughput, measured as accepted pull requests per engineer per week, increased 18.4% (95% CI: 11.2–25.6%) in the asynchronous condition. Self-reported focus-time also increased (mean +7.2 hours/week, p<0.001). We did not observe a degradation in cross-team coordination latency or incident response time. We discuss why the conventional argument that synchronous standups are necessary for "team cohesion" did not survive instrumentation.

## Methods

Teams were randomly assigned to one of two conditions for 12 consecutive weeks. The synchronous condition required a daily 15-minute video standup at a fixed time. The asynchronous condition required each engineer to post a structured text update (yesterday / today / blockers) to the team channel within a 4-hour window each morning. All other process variables — sprint cadence, code-review SLAs, on-call rotation — were held constant. We instrumented Git activity, Slack response latency, and PagerDuty incident metrics. Self-report data was collected via weekly surveys (n=2,244 responses, 89% response rate).

| Metric | Synchronous (n=7 teams) | Asynchronous (n=7 teams) | Δ |
| --- | --- | --- | --- |
| Accepted PRs / engineer / week | 4.34 | 5.14 | +18.4% |
| Self-reported focus hours / week | 22.1 | 29.3 | +7.2h |
| Cross-team comment-to-response latency (median) | 47 min | 42 min | -5 min |
| Incident MTTR (median, P1) | 18 min | 19 min | +1 min |

## Results

The throughput increase in the asynchronous condition was robust across team size (4–18 engineers), seniority distribution, and product surface (frontend, backend, infra). The largest gains came from teams in the 8–14 engineer range, consistent with the hypothesis that the synchronous-standup tax scales superlinearly with team size. Two of the seven asynchronous teams reverted to synchronous standups in week 9 and week 11 respectively; both reverted because of new-hire onboarding, not because of measured throughput regressions.

| Team size | Sync Δ throughput | Async Δ throughput |
| --- | --- | --- |
| 4–7 engineers | baseline | +9.1% |
| 8–14 engineers | baseline | +24.7% |
| 15+ engineers | baseline | +12.3% |

## Discussion

The "team cohesion" argument for synchronous standups did not survive instrumentation. Self-reported team-cohesion scores were statistically indistinguishable between conditions (sync 4.21 vs async 4.18 on a 5-point Likert, p=0.71). What did differ was *focus-time fragmentation*: synchronous-condition engineers reported significantly more context-switches per day. Our interpretation is that the standup ritual served as an organizational placebo — its perceived value derived from regularity, not from synchronicity. Asynchronous standups preserved the regularity while removing the focus-time cost.
