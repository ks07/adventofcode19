#!/usr/bin/env perl

use strict;
use warnings;

use Data::Dumper;

my $wiredefs = [];
my @wirelocs;
my @overlaps;
my $visited = {};
my $maxlen = 0;

while (my $wireline = <>) {
  chomp $wireline;
  continue unless $wireline;

  my @wiredef = split(',', $wireline);
  push @$wiredefs, \@wiredef;
  $maxlen = @wiredef if @wiredef > $maxlen;
}

for (my $i = 0; $i < $maxlen; $i++) {
  for (my $wireno = 0; $wireno < @$wiredefs; $wireno++) {
    my $w = $wiredefs->[$wireno];
    my $wirecmd = $w->[$i];

    continue unless $wirecmd;

    print "$wireno: $wirecmd\n";

    parse_wire_cmd($wireno, $wirecmd);
  }
}

my $min_dist;
foreach my $loc (@overlaps) {
  my $d = manhattan_dist($loc);
  $min_dist = $d if !$min_dist || $d < $min_dist;
}
print "Done, distance: $min_dist\n";

sub check_for_overlap {
  my $loc = shift;
  my $bucket = $visited->{$loc->[0]}{$loc->[1]};

  push(@overlaps, $loc) if ((keys %$bucket) >= @$wiredefs);
}

sub move_wire {
  my $wireno = shift;
  my $vec  = shift or die "no vector";
  my $wloc = $wirelocs[$wireno];

  my $nx = $wloc->[0] + $vec->[0];
  my $ny = $wloc->[1] + $vec->[1];

  $wirelocs[$wireno] = [$nx, $ny];

  $visited->{$nx}{$ny}{$wireno} = 1;
  
  check_for_overlap([$nx, $ny]);
}

sub print_wire {
  my ($wireno, $wloc) = @_;

  print "$wireno: " . join(',', @$wloc) . "\n";
}

sub parse_wire_cmd {
  my $wireno = shift;
  my $wc = shift or die "blank command!";

  $wc =~ /^([LDRU])(\d+)$/;
  my ($d, $l) = ($1, $2);

  my @dvec;
  @dvec = (-1, 0) if $d eq 'L';
  @dvec = (1,  0) if $d eq 'R';
  @dvec = (0, -1) if $d eq 'D';
  @dvec = (0,  1) if $d eq 'U';

  for (; $l > 0; $l--) {
    move_wire($wireno, \@dvec);
    print_wire($wireno, $wirelocs[$wireno]);
  }
}

sub manhattan_dist {
  my $loc = shift;
  return abs($loc->[0]) + abs($loc->[1]);
}
