# Python String methods — full reference.
# Strings are IMMUTABLE: methods return NEW string, original unchanged.
# Grouped by purpose. Each call shows input -> output.

url = "  https://thetestingAcademy.com/login  "
print(url)
print(url.upper())
print(url.lower())
print(url.strip())


# ============================================================
# 1. Case methods
# ============================================================
s = "hello World"
print(s.upper())          # 'HELLO WORLD'
print(s.lower())          # 'hello world'
print(s.title())          # 'Hello World'           every word cap
print(s.capitalize())     # 'Hello world'           first char cap
print(s.swapcase())       # 'HELLO wORLD'           invert case
print("HeLLo".casefold()) # 'hello'                 aggressive lower (i18n)


# ============================================================
# 2. Whitespace / trimming
# ============================================================
s = "  https://test.com/login  "
print(s.strip())          # 'https://test.com/login'   both sides
print(s.lstrip())         # left only
print(s.rstrip())         # right only
print("xxhelloxx".strip("x"))   # 'hello'             strip given chars
print("hi\n".rstrip())    # 'hi'                       removes \n too


# ============================================================
# 3. Search / locate
# ============================================================
s = "banana"
print(s.find("na"))       # 2     index of first match, -1 if not found
print(s.rfind("na"))      # 4     from right
print(s.index("na"))      # 2     like find but raises ValueError
# print(s.index("z"))     # ValueError
print(s.count("a"))       # 3     non-overlapping occurrences
print("na" in s)          # True  (operator, not method)


# ============================================================
# 4. Boolean checks (is*)
# ============================================================
print("Hello123".isalnum())       # True   letters + digits only
print("Hello".isalpha())          # True   letters only
print("12345".isdigit())          # True   digits only
print("12.5".isdigit())           # False  dot not digit
print("12345".isnumeric())        # True
print("abc".isascii())            # True
print("HELLO".isupper())          # True
print("hello".islower())          # True
print("Hello World".istitle())    # True
print("   ".isspace())            # True
print("var_1".isidentifier())     # True   valid Python identifier
print("hello\n".isprintable())    # False  \n not printable
print("123".isdecimal())          # True


# ============================================================
# 5. Prefix / suffix
# ============================================================
url = "https://thetestingacademy.com/login"
print(url.startswith("https://"))      # True
print(url.endswith(".com/login"))      # True
print(url.startswith(("http://", "https://")))   # tuple = OR check


# ============================================================
# 6. Replace / modify
# ============================================================
s = "test test test"
print(s.replace("test", "PASS"))         # 'PASS PASS PASS'
print(s.replace("test", "PASS", 1))      # 'PASS test test'   max 1 replace
print("hello".center(11, "*"))           # '***hello***'
print("7".zfill(4))                      # '0007'             pad with zeros
print("hi".ljust(6, "."))                # 'hi....'
print("hi".rjust(6, "."))                # '....hi'
print("a\tb".expandtabs(4))              # 'a   b'


# ============================================================
# 7. Split / join
# ============================================================
csv = "pramod,dutta,qa,india"
print(csv.split(","))               # ['pramod', 'dutta', 'qa', 'india']
print(csv.split(",", 2))            # ['pramod', 'dutta', 'qa,india']  maxsplit
print(csv.rsplit(",", 1))           # ['pramod,dutta,qa', 'india']     from right

multiline = "line1\nline2\nline3"
print(multiline.splitlines())       # ['line1', 'line2', 'line3']

print("path/to/file".partition("/"))   # ('path', '/', 'to/file')   first match
print("path/to/file".rpartition("/"))  # ('path/to', '/', 'file')   last match

print(",".join(["a", "b", "c"]))    # 'a,b,c'
print("-".join("abc"))              # 'a-b-c'   joins any iterable of strings


# ============================================================
# 8. Formatting
# ============================================================
name, age = "Pramod", 25

# f-string (modern, preferred)
print(f"Hello {name}, age {age}")
print(f"{age:05d}")                     # '00025'    zero-pad width 5
print(f"{3.14159:.2f}")                 # '3.14'     2 decimals
print(f"{1000000:,}")                   # '1,000,000' thousands
print(f"{0.85:.1%}")                    # '85.0%'    percent
print(f"{name!r}")                      # "'Pramod'" repr
print(f"{name:>10}")                    # right align
print(f"{name:<10}")                    # left align
print(f"{name:^10}")                    # center
print(f"{255:b} {255:o} {255:x}")       # binary, octal, hex

# .format() (older)
print("Hi {}, you are {}".format(name, age))
print("Hi {0}, age {1}, {0} again".format(name, age))
print("Hi {n}, age {a}".format(n=name, a=age))

# % style (oldest, C-like)
print("Hi %s, age %d" % (name, age))


# ============================================================
# 9. Encoding / bytes
# ============================================================
s = "namaste"
b = s.encode("utf-8")                   # str -> bytes
print(b)                                # b'namaste'
print(b.decode("utf-8"))                # bytes -> str




# ============================================================
# Quick reference — all string methods
# ============================================================
# case        upper  lower  title  capitalize  swapcase  casefold
# trim        strip  lstrip  rstrip
# search      find  rfind  index  rindex  count
# check       isalnum  isalpha  isdigit  isnumeric  isdecimal
#             isascii  isupper  islower  istitle  isspace
#             isidentifier  isprintable
# prefix      startswith  endswith
# modify      replace  center  zfill  ljust  rjust  expandtabs
# split/join  split  rsplit  splitlines  partition  rpartition  join
# format      format  format_map  f-string  % operator
# encoding    encode
# translate   maketrans  translate
# operators   +  *  in  not in  [ ]  [ : : ]  len()
