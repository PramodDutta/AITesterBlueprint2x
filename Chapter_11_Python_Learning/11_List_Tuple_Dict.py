# test_cases = ["login","logout","search","checkout"]
# print(len(test_cases))
# print(test_cases[0])
# print(test_cases[3])
# # print(test_cases[4]) # IndexError: list index out of range
# print(test_cases[-1])
# print(test_cases[1:3]) # start, end-1


# test_cases.append("payment")        # add to end
# print(len(test_cases))
# print(test_cases)

# test_cases.insert(0, "smoke")       # add at position
# print(test_cases)

# test_cases.remove("logout")
# print(test_cases)

# popped = test_cases.pop()           # remove & return last
# print(test_cases)
# print(popped)

# print("search" in test_cases) 
# print(sorted([3, 1, 2]))            


# # ------------ Add more List function Below --------


# # ============================================================
# # 1. Create
# # ============================================================
# empty = []
# empty2 = list()
# nums = [1, 2, 3, 4, 5]
# mixed = [1, "two", 3.0, True, None]
# nested = [[1, 2], [3, 4]]
# from_str = list("abc")              # ['a', 'b', 'c']
# from_range = list(range(5))         # [0, 1, 2, 3, 4]
# print(empty, nums, mixed, nested, from_str, from_range)


# # ============================================================
# # 2. Access / slice
# # ============================================================
# items = ["a", "b", "c", "d", "e"]
# print(items[0])         # 'a'
# print(items[-1])        # 'e'        last
# print(items[1:4])       # ['b', 'c', 'd']
# print(items[:3])        # ['a', 'b', 'c']
# print(items[::2])       # ['a', 'c', 'e']   every 2nd
# print(items[::-1])      # reversed
# print(len(items))       # 5


# # ============================================================
# # 3. Add elements
# # ============================================================
# lst = [1, 2, 3]
# lst.append(4)                 # add ONE item at end       -> [1,2,3,4]
# lst.insert(0, 0)              # insert at index           -> [0,1,2,3,4]
# lst.extend([5, 6])            # add MULTIPLE at end       -> [0,1,2,3,4,5,6]
# lst += [7, 8]                 # same as extend            -> [0,1,2,3,4,5,6,7,8]
# print(lst)

# # append vs extend:
# a = [1, 2]
# a.append([3, 4])              # [1, 2, [3, 4]]   adds list as single element
# b = [1, 2]
# b.extend([3, 4])              # [1, 2, 3, 4]     adds each element
# print(a, b)


# # ============================================================
# # 4. Remove elements
# # ============================================================
# lst = ["a", "b", "c", "b", "d"]
# lst.remove("b")               # removes FIRST match       -> ['a','c','b','d']
# print(lst)

# last = lst.pop()              # remove + return last      -> 'd'
# first = lst.pop(0)            # remove + return at index  -> 'a'
# print(lst, last, first)

# del lst[0]                    # delete by index, no return
# print(lst)

# lst2 = [1, 2, 3, 4]
# del lst2[1:3]                 # delete slice              -> [1, 4]
# print(lst2)

# lst3 = [1, 2, 3]
# lst3.clear()                  # empty the list            -> []
# print(lst3)


# # ============================================================
# # 5. Search
# # ============================================================
# items = ["login", "logout", "search", "logout"]
# print(items.index("logout"))      # 1     first index
# print(items.count("logout"))      # 2     occurrences
# print("login" in items)           # True
# print("delete" not in items)      # True


# # ============================================================
# # 6. Sort / reverse
# # ============================================================
# nums = [3, 1, 4, 1, 5, 9, 2, 6]
# nums.sort()                       # IN-PLACE             -> [1,1,2,3,4,5,6,9]
# print(nums)
# nums.sort(reverse=True)           # descending
# print(nums)

# words = ["banana", "apple", "cherry"]
# words.sort(key=len)               # sort by custom key
# print(words)                      # ['apple', 'banana', 'cherry']

# # sorted() returns NEW list, doesn't modify original
# original = [3, 1, 2]
# new = sorted(original)
# print(original, new)              # [3,1,2] [1,2,3]

# lst = [1, 2, 3]
# lst.reverse()                     # IN-PLACE reverse     -> [3, 2, 1]
# print(lst)
# print(list(reversed([1, 2, 3])))  # NEW reversed iter    -> [3, 2, 1]



# # lambda :  one line of code which can do something

# # ============================================================
# # 10. Map / filter / reduce
# # ============================================================
# nums = [1, 2, 3, 4]
# doubled = list(map(lambda x: x * 2, nums))  # [2,4,6,8]
# evens = list(filter(lambda x: x % 2 == 0, nums))   # [2, 4]
# from functools import reduce
# total = reduce(lambda a, b: a + b, nums)           # 10
# print(doubled, evens, total)


# # ============================================================
# # 12. Iterate
# # ============================================================
# items = ["login", "logout", "search"]

# for item in items:
#     print(item)


# # ============================================================
# # 13. Convert
# # ============================================================
# print(list("hello"))                 # ['h','e','l','l','o']
# print(list((1, 2, 3)))               # tuple -> list
# print(list({1, 2, 3}))               # set -> list
# print(list({"a": 1, "b": 2}))        # dict -> list of keys ['a','b']
# print(",".join(["a", "b", "c"]))     # list -> string


# # ============================================================
# # 14. Quick reference — list methods
# # ============================================================
# # add        append  insert  extend  +=
# # remove     remove  pop  clear  del
# # search     index  count  in  not in
# # order      sort  reverse  sorted()  reversed()
# # copy       copy  [:]  list()  copy.deepcopy()
# # aggregate  len  sum  min  max
# # transform  map  filter  reduce  comprehension
# # iterate    for  enumerate  zip


# # ============================================================
# # 15. Tuple — immutable list
# # ============================================================
# point = (10, 20)
# single = (5,)                     # trailing comma needed
# empty_t = ()
# print(point[0], len(point))

# # Only 2 methods (immutable):
# t = (1, 2, 3, 2, 1)
# print(t.count(2))                 # 2
# print(t.index(3))                 # 2

# # Unpack:
# x, y = point
# print(x, y)






# # Tuples support same access/slice/in/iterate as list.
# # Cannot: append, remove, sort in-place.

# ============================================================
#  Dict — key-value pairs
# ============================================================
user =  {
    "name" : "Pramod",
    "age" : 45,
    "role" : "QA",
    "role" : "Mentor"
}

print(user)
print(user["name"])
print(user.get("email")) 

user["email"] = "test@example.com" 
print(user.get("email")) 
print(user)

user.update({"city": "Delhi", "age": 27}) # bulk add/update
print(user)

# Remove:
user.pop("city")                          # remove + return value
print(user)

last = user.popitem()   
print(user)
                  # remove + return last (k,v) pair
user.clear()
print(user)

user = {"name": "Pramod", "age": 25, "role": "QA"}



# Iterate:
# for k in user:                            # keys
#     print(k)
for k, v in user.items():                 # key + value
    print(k, "=", v)
# for v in user.values():                   # values
#     print(v)


# Lists of keys/values/items:
print(list(user.keys()))
print(list(user.values()))
print(list(user.items()))
