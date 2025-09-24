def lname: .labels|map(.name|ascii_downcase);
def prio_score:
  (lname as $n
   | ($n|map(select(test("^p[0-9]$")))[0] // ($n|map(select(IN("priority:critical","priority:high","priority:medium","priority:low")))[0] // "")) ) as $p
  | if ($p|startswith("p")) then ($p|ltrimstr("p")|tonumber)
    else if $p=="priority:critical" then 0
    else if $p=="priority:high"     then 1
    else if $p=="priority:medium"   then 2
    else if $p=="priority:low"      then 3
    else 9 end;
def prio_label($s): if $s==0 then "P0" elif $s==1 then "P1" elif $s==2 then "P2" elif $s==3 then "P3" else "P?" end;
def status_guess:
  (lname as $n
   | ($n|map(select(startswith("status:")))[0]) ) as $s
  | if $s then ($s|split(":"))[1] else (if (.state|ascii_downcase)=="closed" then "done" else "in-progress" end) end;

[ .[] | {
    num: ("#"+(.number|tostring)),
    title, url,
    prio_s:(prio_score),
    prio:(prio_label(prio_score)),
    status:(status_guess),
    updated:(.updatedAt|split(".")[0]|gsub("T";" "))
  } ]
| sort_by(.prio_s, (.updated|fromdateiso8601))
| (["#","Epic","Priority","Status","Updated"] | @tsv), (.[] | [ .num, .title, .prio, .status, .updated ] | @tsv)
